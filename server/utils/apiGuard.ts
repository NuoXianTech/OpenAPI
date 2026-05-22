/**
 * API Guard · 规则链。
 *
 * 输入：H3Event + 命中的 apis DB 记录 + manifest 端点 + 路径参数 + 本次调用扣费金额
 * 输出：passed=true（挂 context）或 passed=false（错误信息）
 *
 * effectiveCost 由 gate 中间件按命中的 method 在 api.methodCosts 中解析后传入：
 * 同一组 API 下不同 method 可有不同扣费金额（GET 免费 / POST 收费等）。
 *
 * 规则顺序（短路求值）：
 *   1. isEnabled
 *   2. isApiKey 强制 / effectiveCost>0 → 必须带 ApiKey；校验 key + expiresAt + scope + ip CIDR 白名单
 *   3. ApiKey 可选携带 → 若带了也校验；不带则 IP 为限流/配额主键
 *   4. rateLimit（多窗口，任意一个超限即拒）
 *   5. dailyQuota（API 级）
 *   6. credits 积分校验（effectiveCost>0 时；先校验 apiKey 自身 totalQuota，再校验持有者积分）
 *
 * 故障降级：
 *   - 鉴权类失败：fail-close（401/403）
 *   - 限流/配额 driver 抛错：fail-open，但 console.error 记日志
 *   - 积分校验抛错：fail-close（402），避免漏扣
 */

import type { H3Event } from 'h3'
import { getHeader, getQuery, getRequestIP } from 'h3'
import { and, eq, gte } from 'drizzle-orm'
import { apiCallStats, apiKeys, users } from '@nuxthub/db/schema'
import type { RateLimitWindow } from '~~/shared/config/apiGuard'
import { API_GUARD_ERROR } from '~~/shared/config/apiGuard'
import type { EndpointMatch, GateOutcome, RateLimitResult } from '~~/shared/types/api-guard'
import { getRateLimiter } from '~~/server/utils/rateLimit'
import { getLocalDayStart } from '~~/server/utils/localTime'
import { ipInAnyCidr } from '~~/shared/utils/cidr'

type ApiRecord = typeof import('@nuxthub/db/schema').apis.$inferSelect
type ApiKeyRecord = typeof apiKeys.$inferSelect
type ErrorDef = { status: number, code: string, msg: string }

export interface GateDeniedHeaders {
  [key: string]: string
}

export type GateResult
  = | {
    passed: true
    outcome: 'passed'
    apiKey: ApiKeyRecord | null
    rateLimitHeaders: GateDeniedHeaders
  }
  | {
    passed: false
    outcome: GateOutcome
    error: ErrorDef
    headers?: GateDeniedHeaders
    /** 附加给客户端的结构化信息（写入 openApiFail 的 data 字段） */
    detail?: Record<string, unknown>
    /** 拒绝时若已识别到具体 Key，仍带出以便日志归属（INVALID/MISSING 时为 null） */
    apiKey: ApiKeyRecord | null
  }

const QUOTA_CACHE_TTL_MS = 1_000
const quotaCache = new Map<number, { value: number, expiresAt: number }>()

function readApiKeyFromEvent(event: H3Event): string {
  const headerKey = (getHeader(event, 'x-api-key') || '').toString().trim()
  if (headerKey) return headerKey
  const query = getQuery(event)
  const queryKey = (query.apikey || '').toString().trim()
  return queryKey
}

function hasScope(scopes: string[] | null | undefined, api: ApiRecord): boolean {
  if (!scopes || scopes.length === 0) return true
  const needed = [`${api.pathVersion}.${api.code}`, api.code, '*']
  return scopes.some(s => needed.includes(s))
}

async function loadApiKey(rawKey: string): Promise<ApiKeyRecord | null> {
  if (!rawKey) return null
  const res = await db.select().from(apiKeys).where(eq(apiKeys.apiKey, rawKey)).limit(1)
  return res[0] || null
}

async function getTodayQuotaUsage(apiId: number): Promise<number> {
  const cached = quotaCache.get(apiId)
  const now = Date.now()
  if (cached && cached.expiresAt > now) return cached.value

  const todayStart = getLocalDayStart()
  const rows = await db.select({ total: apiCallStats.totalCount })
    .from(apiCallStats)
    .where(and(eq(apiCallStats.apiId, apiId), gte(apiCallStats.statDate, todayStart)))
    .limit(1)
  const value = rows[0]?.total ?? 0
  quotaCache.set(apiId, { value, expiresAt: now + QUOTA_CACHE_TTL_MS })
  return value
}

function rateLimitHeaders(results: RateLimitResult[]): GateDeniedHeaders {
  if (results.length === 0) return {}
  // 取剩余额度最小的窗口作为响应头主引用
  const primary = results.reduce((min, cur) => (cur.remaining < min.remaining ? cur : min))
  return {
    'X-RateLimit-Limit': String(primary.limit),
    'X-RateLimit-Remaining': String(Math.max(primary.remaining, 0)),
    'X-RateLimit-Reset': String(Math.ceil(primary.resetAtMs / 1_000)),
    'X-RateLimit-Window': primary.window
  }
}

async function checkRateLimit(api: ApiRecord, subjectKey: string): Promise<RateLimitResult[] | { denied: RateLimitResult }> {
  const windowSpecs: Array<{ window: RateLimitWindow, limit: number }> = [
    { window: 'second', limit: api.rateLimitPerSecond },
    { window: 'minute', limit: api.rateLimitPerMinute },
    { window: 'hour', limit: api.rateLimitPerHour },
    { window: 'day', limit: api.rateLimitPerDay }
  ]
  const windows = windowSpecs.filter(w => w.limit > 0)

  if (windows.length === 0) return []

  const limiter = getRateLimiter()
  const results: RateLimitResult[] = []
  for (const { window, limit } of windows) {
    try {
      const key = `api:${api.id}:${subjectKey}:${window}`
      const result = await limiter.consume(key, limit, window)
      results.push(result)
      if (!result.allowed) return { denied: result }
    } catch (err) {
      // fail-open：driver 故障不阻断请求，仅日志
      console.error('[api-guard] rateLimit driver error', {
        apiId: api.id,
        window,
        error: (err as Error).message
      })
    }
  }
  return results
}

export interface RunGuardInput {
  event: H3Event
  api: ApiRecord
  match: EndpointMatch
  /** gate 已按本次请求 method 在 api.methodCosts 中解析出的扣费金额（0=免费） */
  effectiveCost: number
}

export async function runApiGuard({ event, api, match: _match, effectiveCost }: RunGuardInput): Promise<GateResult> {
  // [1] isEnabled
  if (!api.isEnabled) {
    return { passed: false, outcome: 'disabled', error: API_GUARD_ERROR.DISABLED, apiKey: null }
  }

  // [2] / [3] ApiKey 处理
  const rawKey = readApiKeyFromEvent(event)
  let apiKey: ApiKeyRecord | null = null

  if (rawKey) {
    apiKey = await loadApiKey(rawKey)
    if (!apiKey) {
      return { passed: false, outcome: 'invalid_api_key', error: API_GUARD_ERROR.INVALID_API_KEY, apiKey: null }
    }
    if (!apiKey.isActive || apiKey.revokedAt) {
      return { passed: false, outcome: 'revoked_api_key', error: API_GUARD_ERROR.REVOKED_API_KEY, apiKey }
    }
    // 防御性归一：drizzle PG timestamp 通常返回 Date，但保险起见兼容字符串/数字
    const expiresAtRaw = apiKey.expiresAt as Date | string | number | null | undefined
    const expiresAtMs = expiresAtRaw instanceof Date
      ? expiresAtRaw.getTime()
      : (expiresAtRaw === null || expiresAtRaw === undefined
          ? null
          : new Date(expiresAtRaw).getTime())
    if (expiresAtMs !== null && Number.isFinite(expiresAtMs) && expiresAtMs <= Date.now()) {
      const expiresAtIso = new Date(expiresAtMs).toISOString()
      return {
        passed: false,
        outcome: 'expired_api_key',
        error: {
          ...API_GUARD_ERROR.EXPIRED_API_KEY,
          msg: `API Key 已于 ${expiresAtIso} 过期`
        },
        detail: { expiresAt: expiresAtIso },
        apiKey
      }
    }
    if (!hasScope(apiKey.scopes, api)) {
      return { passed: false, outcome: 'scope_denied', error: API_GUARD_ERROR.SCOPE_DENIED, apiKey }
    }
    const ip = getRequestIP(event) || null
    if (!ipInAnyCidr(ip, apiKey.ipWhitelist)) {
      return { passed: false, outcome: 'ip_denied', error: API_GUARD_ERROR.IP_DENIED, apiKey }
    }
  } else if (api.isApiKey || effectiveCost > 0) {
    // 显式开启 isApiKey 必需，或本次 method 有扣费要求 → 必须带 apiKey 才能定位归属用户
    return { passed: false, outcome: 'missing_api_key', error: API_GUARD_ERROR.MISSING_API_KEY, apiKey: null }
  }

  // [4] 限流：带 key 按 key 计，不带按 IP 计
  const subjectKey = apiKey
    ? `apikey:${apiKey.id}`
    : `ip:${getRequestIP(event) || 'unknown'}`
  const rateResult = await checkRateLimit(api, subjectKey)
  if ('denied' in rateResult) {
    return {
      passed: false,
      outcome: 'rate_limited',
      error: API_GUARD_ERROR.RATE_LIMITED,
      headers: rateLimitHeaders([rateResult.denied]),
      apiKey
    }
  }

  // [5] API 日配额（api.dailyQuota 为 0 表示不限）
  if (api.dailyQuota > 0) {
    try {
      const used = await getTodayQuotaUsage(api.id)
      if (used >= api.dailyQuota) {
        return { passed: false, outcome: 'quota_exceeded', error: API_GUARD_ERROR.QUOTA_EXCEEDED, apiKey }
      }
    } catch (err) {
      console.error('[api-guard] quota check failed', {
        apiId: api.id,
        error: (err as Error).message
      })
      // fail-open
    }
  }

  // [6] 积分校验（仅当本次 method 扣费 > 0 且带了 apiKey 时进行；apiKey 已在 [2] 校验为存在）
  if (effectiveCost > 0 && apiKey) {
    // [6a] Key 级累计积分上限（totalQuota 为 null 表示无限）
    if (apiKey.totalQuota !== null && apiKey.totalQuota !== undefined) {
      const used = Number(apiKey.usedCredits || 0)
      const limit = Number(apiKey.totalQuota)
      if (used + effectiveCost > limit) {
        return {
          passed: false,
          outcome: 'api_key_quota_exceeded',
          error: {
            ...API_GUARD_ERROR.API_KEY_QUOTA_EXCEEDED,
            msg: `该 API Key 累计已消耗 ${used} 积分，配额上限 ${limit}，本次调用需要 ${effectiveCost} 积分`
          },
          detail: { usedCredits: used, totalQuota: limit, cost: effectiveCost },
          apiKey
        }
      }
    }

    // [6b] 用户钱包余额校验
    try {
      const userRow = await db.select({ credits: users.credits })
        .from(users)
        .where(eq(users.id, apiKey.userId))
        .limit(1)
      const balance = Number(userRow[0]?.credits || 0)
      if (balance < effectiveCost) {
        return { passed: false, outcome: 'insufficient_credits', error: API_GUARD_ERROR.INSUFFICIENT_CREDITS, apiKey }
      }
    } catch (err) {
      console.error('[api-guard] credits check failed', {
        apiId: api.id,
        error: (err as Error).message
      })
      // 积分校验异常时 fail-close 更安全：避免漏扣或误调用
      return { passed: false, outcome: 'insufficient_credits', error: API_GUARD_ERROR.INSUFFICIENT_CREDITS, apiKey }
    }
  }

  return {
    passed: true,
    outcome: 'passed',
    apiKey,
    rateLimitHeaders: rateLimitHeaders(rateResult)
  }
}

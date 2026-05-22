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
 *   2. isApiKey 强制 / effectiveCost>0 → 必须带 ApiKey；校验 key + scope + ip + referer 白名单
 *   3. ApiKey 可选携带 → 若带了也校验；不带则 IP 为限流/配额主键
 *   4. rateLimit（多窗口，任意一个超限即拒）
 *   5. dailyQuota（API 级）
 *   6. credits 积分校验（effectiveCost>0 时，校验 apiKey 持有者积分）
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

type ApiRecord = typeof import('@nuxthub/db/schema').apis.$inferSelect
type ApiKeyRecord = typeof apiKeys.$inferSelect
type ErrorDef = (typeof API_GUARD_ERROR)[keyof typeof API_GUARD_ERROR]

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

function readRefererFromEvent(event: H3Event): string | null {
  return (getHeader(event, 'referer') || getHeader(event, 'referrer') || '').toString().trim() || null
}

function matchesWhitelist(whitelist: string[] | null | undefined, value: string | null): boolean {
  if (!whitelist || whitelist.length === 0) return true
  if (!value) return false
  for (const entry of whitelist) {
    const trimmed = entry.trim()
    if (!trimmed) continue
    if (trimmed === value) return true
    // 支持简单前缀匹配：'https://example.com' 匹配 'https://example.com/*'
    if (trimmed.endsWith('*') && value.startsWith(trimmed.slice(0, -1))) return true
  }
  return false
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
  const windows: Array<{ window: RateLimitWindow, limit: number }> = [
    { window: 'second', limit: api.rateLimitPerSecond },
    { window: 'minute', limit: api.rateLimitPerMinute },
    { window: 'hour', limit: api.rateLimitPerHour },
    { window: 'day', limit: api.rateLimitPerDay }
  ].filter(w => w.limit > 0)

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
    return { passed: false, outcome: 'disabled', error: API_GUARD_ERROR.DISABLED }
  }

  // [2] / [3] ApiKey 处理
  const rawKey = readApiKeyFromEvent(event)
  let apiKey: ApiKeyRecord | null = null

  if (rawKey) {
    apiKey = await loadApiKey(rawKey)
    if (!apiKey) {
      return { passed: false, outcome: 'invalid_api_key', error: API_GUARD_ERROR.INVALID_API_KEY }
    }
    if (!apiKey.isActive || apiKey.revokedAt) {
      return { passed: false, outcome: 'revoked_api_key', error: API_GUARD_ERROR.REVOKED_API_KEY }
    }
    if (apiKey.expiresAt && apiKey.expiresAt.getTime() <= Date.now()) {
      return { passed: false, outcome: 'expired_api_key', error: API_GUARD_ERROR.EXPIRED_API_KEY }
    }
    if (!hasScope(apiKey.scopes, api)) {
      return { passed: false, outcome: 'scope_denied', error: API_GUARD_ERROR.SCOPE_DENIED }
    }
    const ip = getRequestIP(event) || null
    if (!matchesWhitelist(apiKey.ipWhitelist, ip)) {
      return { passed: false, outcome: 'ip_denied', error: API_GUARD_ERROR.IP_DENIED }
    }
    const referer = readRefererFromEvent(event)
    if (!matchesWhitelist(apiKey.refererWhitelist, referer)) {
      return { passed: false, outcome: 'referer_denied', error: API_GUARD_ERROR.REFERER_DENIED }
    }
  } else if (api.isApiKey || effectiveCost > 0) {
    // 显式开启 isApiKey 必需，或本次 method 有扣费要求 → 必须带 apiKey 才能定位归属用户
    return { passed: false, outcome: 'missing_api_key', error: API_GUARD_ERROR.MISSING_API_KEY }
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
      headers: rateLimitHeaders([rateResult.denied])
    }
  }

  // [5] API 日配额（api.dailyQuota 为 0 表示不限）
  if (api.dailyQuota > 0) {
    try {
      const used = await getTodayQuotaUsage(api.id)
      if (used >= api.dailyQuota) {
        return { passed: false, outcome: 'quota_exceeded', error: API_GUARD_ERROR.QUOTA_EXCEEDED }
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
    try {
      const userRow = await db.select({ credits: users.credits })
        .from(users)
        .where(eq(users.id, apiKey.userId))
        .limit(1)
      const balance = Number(userRow[0]?.credits || 0)
      if (balance < effectiveCost) {
        return { passed: false, outcome: 'insufficient_credits', error: API_GUARD_ERROR.INSUFFICIENT_CREDITS }
      }
    } catch (err) {
      console.error('[api-guard] credits check failed', {
        apiId: api.id,
        error: (err as Error).message
      })
      // 积分校验异常时 fail-close 更安全：避免漏扣或误调用
      return { passed: false, outcome: 'insufficient_credits', error: API_GUARD_ERROR.INSUFFICIENT_CREDITS }
    }
  }

  return {
    passed: true,
    outcome: 'passed',
    apiKey,
    rateLimitHeaders: rateLimitHeaders(rateResult)
  }
}

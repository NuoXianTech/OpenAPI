/**
 * API 调用统计 · Nitro plugin
 *
 * 实现：用 Nitro 标准 `request` / `afterResponse` 生命周期 hook 替代
 * 早期版本里手挂的 `event.node.res.once('finish', ...)`。`afterResponse`
 * 是 Nitro 跨运行时（Node / Vercel / CF Workers）官方支持的钩子，
 * 不依赖具体 Node res 对象，便于未来切换部署目标。
 *
 * 流程：
 * 1. `request` 阶段：判断是否在治理范围内（shouldTrackPath），
 *    若是则把 startedAt 与各请求侧元数据快照挂到 event.context.apiStatsTracked。
 *    （gate 中间件后续仍会在同一 event.context 上挂 apiStatsTarget / apiKey / apiBilling）
 * 2. `afterResponse` 阶段：读取 tracked 快照与 gate 写入的上下文，
 *    写入 apiCalls 与日统计，并按 billing 决定是否扣费。
 */

import type { H3Event } from 'h3'
import { getHeader, getQuery, getRequestIP, getRequestURL } from 'h3'
import { apiCallService } from '~~/server/service/apiCallService'
import { apiKeyService } from '~~/server/service/apiKeyService'
import { apiService, type StatisticsTargetItem } from '~~/server/service/apiService'
import { creditService } from '~~/server/service/creditService'
import { shouldCharge } from '~~/server/utils/apiCallOutcome'
import { isGuardedPath } from '~~/shared/config/apiGuard'

const STATISTICS_TARGET_CACHE_TTL_MS = 15_000

type StatisticsTargetCache = {
  expiresAt: number
  byPath: Map<string, Array<{
    id: number
    apiPath: string
    methods: Set<string>
  }>>
}

interface ApiStatsTracked {
  startedAt: number
  pathname: string
  method: string
  ip: string | null
  apiKey: string
  requestSize: number | null
  userAgent: string | null
  referer: string | null
  queryString: string | null
}

declare module 'h3' {
  interface H3EventContext {
    apiStatsTracked?: ApiStatsTracked
  }
}

let statisticsTargetCache: StatisticsTargetCache | null = null
let statisticsTargetCachePromise: Promise<StatisticsTargetCache> | null = null

function normalizePathname(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1)
  }
  return pathname
}

function parseMethods(httpMethod: string) {
  return new Set(
    httpMethod
      .split(',')
      .map(method => method.trim().toUpperCase())
      .filter(Boolean),
  )
}

function parseOptionalInt(value: string | string[] | number | null | undefined) {
  const normalized = Array.isArray(value) ? value[0] : value
  if (normalized === null || normalized === undefined || normalized === '') {
    return null
  }

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) {
    return null
  }

  const intValue = Math.trunc(parsed)
  return intValue >= 0 ? intValue : null
}

function getApiKeyFromEvent(event: H3Event) {
  const apiKeyFromHeader = (getHeader(event, 'x-api-key') || '').toString().trim()
  if (apiKeyFromHeader) {
    return apiKeyFromHeader
  }

  const query = getQuery(event)
  return (query.apiKey || '').toString().trim()
}

function supportsMethod(httpMethodList: Set<string>, method: string) {
  return httpMethodList.has(method)
    || httpMethodList.has('*')
    || httpMethodList.has('ALL')
}

function buildTargetCache(rows: StatisticsTargetItem[]): StatisticsTargetCache {
  const byPath = new Map<string, Array<{
    id: number
    apiPath: string
    methods: Set<string>
  }>>()

  for (const row of rows) {
    const normalizedPath = normalizePathname(row.apiPath)
    const candidates = byPath.get(normalizedPath) || []
    candidates.push({
      id: row.id,
      apiPath: row.apiPath,
      methods: parseMethods(row.httpMethod),
    })
    byPath.set(normalizedPath, candidates)
  }

  return {
    expiresAt: Date.now() + STATISTICS_TARGET_CACHE_TTL_MS,
    byPath,
  }
}

async function loadStatisticsTargetCache() {
  const now = Date.now()
  if (statisticsTargetCache && statisticsTargetCache.expiresAt > now) {
    return statisticsTargetCache
  }

  if (!statisticsTargetCachePromise) {
    statisticsTargetCachePromise = (async () => {
      const rows = await apiService.listStatisticsTargets()
      const cache = buildTargetCache(rows)
      statisticsTargetCache = cache
      return cache
    })().finally(() => {
      statisticsTargetCachePromise = null
    })
  }

  return statisticsTargetCachePromise
}

async function resolveStatisticsTarget(pathname: string, method: string) {
  const cache = await loadStatisticsTargetCache()
  const candidates = cache.byPath.get(pathname)
  if (!candidates || candidates.length === 0) {
    return null
  }

  const target = candidates.find(candidate => supportsMethod(candidate.methods, method))
  if (!target) {
    return null
  }

  return {
    apiId: target.id,
    apiPath: target.apiPath,
  }
}

async function resolveApiKeyId(apiKey: string) {
  if (!apiKey) {
    return null
  }

  const matchedApiKey = await apiKeyService.getByApiKey(apiKey)
  if (!matchedApiKey || !matchedApiKey.isActive) {
    return null
  }

  return matchedApiKey.id
}

async function recordCall(event: H3Event, tracked: ApiStatsTracked) {
  const statusCode = Math.trunc(event.node.res.statusCode || 200)
  const responseSize = parseOptionalInt(
    event.node.res.getHeader('content-length') as string | string[] | number | undefined,
  )
  const latencyMs = Math.max(Date.now() - tracked.startedAt, 0)

  try {
    // 优先用 gate 中间件挂在 context 上的目标（避免重复查 manifest/DB）
    const target = event.context.apiStatsTarget
      ? { apiId: event.context.apiStatsTarget.apiId, apiPath: event.context.apiStatsTarget.apiPath }
      : await resolveStatisticsTarget(tracked.pathname, tracked.method)
    if (!target) {
      return
    }

    // gate 已解析的 apiKey 直接复用，避免二次查询
    const apiKeyId = event.context.apiKey?.id ?? await resolveApiKeyId(tracked.apiKey)
    const apiKeyUserId = event.context.apiKey?.userId ?? null
    const billing = event.context.apiBilling

    // 计费判定：仅当 gate 通过且具备扣费上下文时执行
    const willCharge = billing
      ? shouldCharge({
          costCredits: billing.costCredits,
          apiKeyUserId: billing.apiKeyUserId,
          forcedOutcome: billing.forcedOutcome,
          statusCode,
        })
      : false

    // 业务标记的失败信息，覆盖默认 errorCode/errorMessage
    const errorCode = billing?.forcedOutcome === 'failed' ? billing.failedCode : null
    const errorMessage = billing?.forcedOutcome === 'failed' ? billing.failedMessage : null

    // 业务标记 forced=failed 时，statusCode 仍是真实的（200），但要让 stats 视为失败：
    // 借助传入 addCallAndUpsertDailyStat 一个修正后的 statusCode 给统计逻辑
    const statStatusCode = billing?.forcedOutcome === 'failed' && statusCode < 400
      ? 500 // 业务失败但 HTTP 200 → 统计按失败计；apiCalls.statusCode 仍记真实值
      : statusCode

    const callId = await apiCallService.addCallAndUpsertDailyStat({
      apiId: target.apiId,
      apiKeyId,
      userId: apiKeyUserId,
      path: tracked.pathname,
      method: tracked.method,
      statusCode,
      latencyMs,
      ip: tracked.ip,
      userAgent: tracked.userAgent,
      referer: tracked.referer,
      queryString: tracked.queryString,
      requestSize: tracked.requestSize,
      responseSize,
      statDate: new Date(),
      errorCode,
      errorMessage,
      creditsCost: 0, // 占位，扣费成功后再补
      statusCodeForStats: statStatusCode,
    })

    // 扣费 · 单独事务，与日志写入解耦避免互相阻塞
    if (willCharge && billing && billing.apiKeyUserId && callId) {
      try {
        const r = await creditService.charge({
          userId: billing.apiKeyUserId,
          amount: billing.costCredits,
          apiId: target.apiId,
          apiCallId: callId,
          remark: `API 调用扣费 · ${target.apiPath}`,
        })
        if (r.charged > 0) {
          // 把实际扣除的金额回填到 apiCalls.creditsCost
          await apiCallService.patchCreditsCost(callId, r.charged)
        }
      }
      catch (err) {
        // 扣费失败不应回滚日志，仅记录错误（极少：积分已被 gate 校验过）
        console.error('failed to charge credits after api call', {
          callId,
          userId: billing.apiKeyUserId,
          amount: billing.costCredits,
          error: (err as Error).message,
        })
      }
    }

    if (apiKeyId) {
      await apiKeyService.recordUsage(apiKeyId, tracked.ip)
    }
  }
  catch (error) {
    console.error('failed to record api call stats from plugin', {
      pathname: tracked.pathname,
      method: tracked.method,
      statusCode,
      error,
    })
  }
}

export default defineNitroPlugin((nitroApp) => {
  // request：尽早 stamp 请求侧快照与起始时间戳
  nitroApp.hooks.hook('request', (event) => {
    const requestUrl = getRequestURL(event)
    const pathname = normalizePathname(requestUrl.pathname)
    if (!isGuardedPath(pathname)) {
      return
    }

    event.context.apiStatsTracked = {
      startedAt: Date.now(),
      pathname,
      method: (event.method || 'GET').toUpperCase(),
      ip: getRequestIP(event) || null,
      apiKey: getApiKeyFromEvent(event),
      requestSize: parseOptionalInt(getHeader(event, 'content-length')),
      userAgent: (getHeader(event, 'user-agent') || null)?.slice(0, 500) || null,
      referer: (getHeader(event, 'referer') || getHeader(event, 'referrer') || null)?.slice(0, 1000) || null,
      queryString: requestUrl.search ? requestUrl.search.slice(1, 2001) : null,
    }
  })

  // afterResponse：响应已发出后异步落库；fire-and-forget 避免阻塞请求生命周期
  nitroApp.hooks.hook('afterResponse', (event) => {
    const tracked = event.context.apiStatsTracked
    if (!tracked) {
      return
    }
    void recordCall(event, tracked)
  })
})

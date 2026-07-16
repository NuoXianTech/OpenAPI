/**
 * API guard rule chain.
 *
 * The guard checks API availability, optional API key auth, memory rate limits,
 * daily quota, and credit balance before a public API handler runs.
 */

import type { H3Event } from 'h3'
import {
  defineEventHandler,
  getHeader,
  getQuery,
  getRequestIP,
  getRequestURL,
  setResponseHeader,
  setResponseHeaders
} from 'h3'
import { eq } from 'drizzle-orm'
import { apiKeys, users } from '~~/server/db/schema'
import type { RateLimitWindow } from '~~/server/config/api-guard'
import {
  API_GUARD_ERROR,
  VERSION_CODE_PATTERN,
  normalizePathname,
  resolveMethodCost
} from '~~/server/config/api-guard'
import type { ApiGuardConfig, GateOutcome, RateLimitResult } from '~~/server/types/api-guard'
import { getRateLimiter } from '~~/server/utils/rate-limit'
import { isRedisUnavailableError } from '~~/server/utils/redis'
import { ipInAnyCidr } from '#shared/utils/cidr'
import { apiKeyService } from '~~/server/services/api-key-service'
import { apiService } from '~~/server/services/api-service'
import { reserveApiDailyQuota } from '~~/server/services/api-daily-quota-service'
import { getAllowedMethods, getManifestApi, matchEndpoint } from '~~/server/utils/api-manifest'
import { clampInteger, toNullableNonNegativeInteger, toNumber } from '~~/server/utils/number'
import { openApiBizFail } from '~~/server/utils/api-call-outcome'
import { openApiFail, type OpenApiResponse } from '~~/server/utils/open-api-response'
import { ensureRequestId } from '~~/server/utils/request-id'
import { readRequestMeta } from '~~/server/utils/request-meta'
import { firstRow } from '~~/server/utils/row'
import { readQueryString, sanitizeQueryStringForLog } from '~~/server/utils/request-query'
import { runWithTimeout } from '~~/server/utils/timeout'

type ApiKeyRecord = typeof apiKeys.$inferSelect

interface ErrorDefinition {
  status: number
  code: string
  msg: string
}

interface ApiKeyQuotaReservation {
  apiKeyId: number
  amount: number
}

type GateResponseHeaders = Record<string, string>

type GateResult
  = | {
    passed: true
    outcome: 'passed'
    apiKey: ApiKeyRecord | null
    quotaReservation: ApiKeyQuotaReservation | null
    rateLimitHeaders: GateResponseHeaders
  }
  | {
    passed: false
    outcome: GateOutcome
    error: ErrorDefinition
    headers?: GateResponseHeaders
    detail?: Record<string, unknown>
    apiKey: ApiKeyRecord | null
  }

type OpenApiGateResult
  = | { status: 'passed', timeoutMs: number }
    | { status: 'rejected', response: OpenApiResponse }
    | { status: 'unmatched' }

export interface OpenApiHandlerContext {
  signal: AbortSignal
}

interface OpenApiEventHandler<TResult> {
  (event: H3Event, context: OpenApiHandlerContext): TResult | Promise<TResult>
}

function readApiKeyFromEvent(event: H3Event): string {
  const headerKey = (getHeader(event, 'x-api-key') || '').toString().trim()
  if (headerKey) return headerKey
  const query = getQuery(event)
  return readQueryString(query.apikey).trim()
}

function hasScope(scopes: string[] | null | undefined, api: ApiGuardConfig): boolean {
  if (!scopes || scopes.length === 0) return true
  const needed = [`${api.pathVersion}.${api.code}`, api.code, '*']
  return scopes.some(s => needed.includes(s))
}

async function loadApiKey(rawKey: string): Promise<ApiKeyRecord | null> {
  if (!rawKey) return null
  const res = await db.select().from(apiKeys).where(eq(apiKeys.apiKey, rawKey)).limit(1)
  return firstRow(res)
}

function rateLimitHeaders(results: RateLimitResult[]): GateResponseHeaders {
  if (results.length === 0) return {}
  const primary = results.reduce((min, cur) => (cur.remaining < min.remaining ? cur : min))
  return {
    'X-RateLimit-Limit': String(primary.limit),
    'X-RateLimit-Remaining': String(Math.max(primary.remaining, 0)),
    'X-RateLimit-Reset': String(Math.ceil(primary.resetAtMs / 1_000)),
    'X-RateLimit-Window': primary.window
  }
}

function rateLimitDeniedHeaders(result: RateLimitResult): GateResponseHeaders {
  return {
    ...rateLimitHeaders([result]),
    'Retry-After': String(Math.max(Math.ceil((result.resetAtMs - Date.now()) / 1_000), 1))
  }
}

async function checkRateLimit(
  api: ApiGuardConfig,
  subjectKey: string
): Promise<RateLimitResult[] | { denied: RateLimitResult }> {
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
      console.error(`[api-guard] ${limiter.name} rate limiter error`, {
        apiId: api.id,
        window,
        error: (err as Error).message
      })
      if (isRedisUnavailableError(err)) throw err
    }
  }
  return results
}

interface RunGuardInput {
  event: H3Event
  api: ApiGuardConfig
  effectiveCost: number
}

async function runApiGuard({ event, api, effectiveCost }: RunGuardInput): Promise<GateResult> {
  if (!api.isEnabled) {
    return { passed: false, outcome: 'disabled', error: API_GUARD_ERROR.DISABLED, apiKey: null }
  }

  const rawKey = readApiKeyFromEvent(event)
  let apiKey: ApiKeyRecord | null = null
  let quotaReservation: ApiKeyQuotaReservation | null = null

  if (rawKey) {
    apiKey = await loadApiKey(rawKey)
    if (!apiKey) {
      return { passed: false, outcome: 'invalid_api_key', error: API_GUARD_ERROR.INVALID_API_KEY, apiKey: null }
    }
    if (!apiKey.isActive || apiKey.revokedAt) {
      return { passed: false, outcome: 'disabled_api_key', error: API_GUARD_ERROR.DISABLED_API_KEY, apiKey }
    }

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
          msg: `API Key expired at ${expiresAtIso}`
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
    return { passed: false, outcome: 'missing_api_key', error: API_GUARD_ERROR.MISSING_API_KEY, apiKey: null }
  }

  const subjectKey = apiKey
    ? `apikey:${apiKey.id}`
    : `ip:${getRequestIP(event) || 'unknown'}`
  let rateResult: Awaited<ReturnType<typeof checkRateLimit>>
  try {
    rateResult = await checkRateLimit(api, subjectKey)
  } catch (error) {
    if (!isRedisUnavailableError(error)) throw error
    return {
      passed: false,
      outcome: 'rate_limit_unavailable',
      error: API_GUARD_ERROR.RATE_LIMIT_UNAVAILABLE,
      apiKey
    }
  }
  if ('denied' in rateResult) {
    return {
      passed: false,
      outcome: 'rate_limited',
      error: API_GUARD_ERROR.RATE_LIMITED,
      headers: rateLimitDeniedHeaders(rateResult.denied),
      apiKey
    }
  }

  if (effectiveCost > 0 && apiKey) {
    try {
      const userRow = await db.select({ credits: users.credits })
        .from(users)
        .where(eq(users.id, apiKey.userId))
        .limit(1)
      const balance = toNumber(userRow[0]?.credits)
      if (balance < effectiveCost) {
        return { passed: false, outcome: 'insufficient_credits', error: API_GUARD_ERROR.INSUFFICIENT_CREDITS, apiKey }
      }
    } catch (err) {
      console.error('[api-guard] credits check failed', {
        apiId: api.id,
        error: (err as Error).message
      })
      return { passed: false, outcome: 'insufficient_credits', error: API_GUARD_ERROR.INSUFFICIENT_CREDITS, apiKey }
    }

    const reserved = await apiKeyService.reserveUsedCredits(apiKey.id, effectiveCost)
    if (!reserved) {
      return {
        passed: false,
        outcome: 'api_key_quota_exceeded',
        error: API_GUARD_ERROR.API_KEY_QUOTA_EXCEEDED,
        apiKey
      }
    }

    quotaReservation = {
      apiKeyId: apiKey.id,
      amount: effectiveCost
    }
  }

  if (api.dailyQuota > 0) {
    try {
      const reserved = await reserveApiDailyQuota(api.id, api.dailyQuota)
      if (!reserved) {
        if (quotaReservation) {
          await apiKeyService.releaseReservedCredits(quotaReservation.apiKeyId, quotaReservation.amount)
          quotaReservation = null
        }
        return { passed: false, outcome: 'quota_exceeded', error: API_GUARD_ERROR.QUOTA_EXCEEDED, apiKey }
      }
    } catch (err) {
      if (quotaReservation) {
        await apiKeyService.releaseReservedCredits(quotaReservation.apiKeyId, quotaReservation.amount).catch((releaseError) => {
          console.error('[api-guard] failed to release API key quota reservation', {
            apiId: api.id,
            apiKeyId: quotaReservation?.apiKeyId,
            error: (releaseError as Error).message
          })
        })
        quotaReservation = null
      }
      console.error('[api-guard] daily quota reservation failed', {
        apiId: api.id,
        error: (err as Error).message
      })
      return { passed: false, outcome: 'quota_unavailable', error: API_GUARD_ERROR.QUOTA_UNAVAILABLE, apiKey }
    }
  }

  return {
    passed: true,
    outcome: 'passed',
    apiKey,
    quotaReservation,
    rateLimitHeaders: rateLimitHeaders(rateResult)
  }
}

function rejectOpenApiGate(
  event: H3Event,
  error: ErrorDefinition,
  detail: Record<string, unknown> | null = null
): OpenApiGateResult {
  return {
    status: 'rejected',
    response: openApiFail(event, error.status, error.code, error.msg, detail)
  }
}

function setGateRejectionContext(
  event: H3Event,
  outcome: GateOutcome,
  error: ErrorDefinition,
  apiKey: ApiKeyRecord | null
): void {
  event.context.apiGateRejection = {
    outcome,
    errorCode: error.code,
    errorMessage: error.msg,
    apiKeyId: apiKey?.id ?? null,
    apiKeyName: apiKey?.name ?? null,
    apiKeyUserId: apiKey?.userId ?? null
  }
}

async function runOpenApiGate(event: H3Event): Promise<OpenApiGateResult> {
  const startedAt = Date.now()
  const requestUrl = getRequestURL(event)
  const pathname = normalizePathname(requestUrl.pathname)
  const method = (event.method || 'GET').toUpperCase()
  const routeMatch = VERSION_CODE_PATTERN.exec(pathname)
  if (!routeMatch) return { status: 'unmatched' }

  const pathVersion = routeMatch[1]!
  const code = routeMatch[2]!
  const manifest = getManifestApi(pathVersion, code)
  if (!manifest) return { status: 'unmatched' }

  const api = await apiService.loadGuardConfig(pathVersion, code)
  if (!api) return rejectOpenApiGate(event, API_GUARD_ERROR.NOT_REGISTERED)

  if (api.isStatistics) {
    const requestMeta = readRequestMeta(event)
    ensureRequestId(event)
    event.context.apiStatsTracked = {
      startedAt,
      pathname,
      method,
      ip: requestMeta.ip,
      requestSize: toNullableNonNegativeInteger(getHeader(event, 'content-length')),
      userAgent: requestMeta.userAgent?.slice(0, 500) || null,
      referer: (getHeader(event, 'referer') || getHeader(event, 'referrer') || null)?.slice(0, 1000) || null,
      queryString: sanitizeQueryStringForLog(requestUrl.search)
    }
    event.context.apiStatsTarget = {
      apiId: api.id,
      apiPath: api.apiPath
    }
  }

  const endpointMatch = matchEndpoint(pathVersion, code, pathname, method)
  if (!endpointMatch) {
    const allowedMethods = getAllowedMethods(pathVersion, code, pathname)
    if (allowedMethods.length > 0) {
      setResponseHeader(event, 'allow', allowedMethods.join(', '))
    }
    setGateRejectionContext(event, 'method_not_allowed', API_GUARD_ERROR.METHOD_NOT_ALLOWED, null)
    return rejectOpenApiGate(event, API_GUARD_ERROR.METHOD_NOT_ALLOWED)
  }

  const effectiveCost = resolveMethodCost(api.methodCosts, method)
  const result = await runApiGuard({ event, api, effectiveCost })
  if (!result.passed) {
    if (result.headers) setResponseHeaders(event, result.headers)
    setGateRejectionContext(event, result.outcome, result.error, result.apiKey)
    return rejectOpenApiGate(event, result.error, result.detail ?? null)
  }

  event.context.apiKey = result.apiKey
    ? { id: result.apiKey.id, userId: result.apiKey.userId, name: result.apiKey.name }
    : null
  event.context.apiBilling = {
    costCredits: effectiveCost,
    apiKeyUserId: result.apiKey?.userId ?? null,
    apiKeyQuotaReservation: result.quotaReservation,
    forcedOutcome: null,
    failedCode: null,
    failedMessage: null
  }

  if (Object.keys(result.rateLimitHeaders).length > 0) {
    setResponseHeaders(event, result.rateLimitHeaders)
  }

  return {
    status: 'passed',
    timeoutMs: clampInteger(api.timeoutMs, 100, 120_000, 10_000)
  }
}

export function defineOpenApiEventHandler<TResult>(handler: OpenApiEventHandler<TResult>) {
  return defineEventHandler(async (event): Promise<TResult | OpenApiResponse> => {
    const gate = await runOpenApiGate(event)
    if (gate.status === 'rejected') return gate.response
    if (gate.status === 'unmatched') {
      return openApiFail(event, 503, 'API_CONFIGURATION_ERROR', '接口治理配置不可用')
    }
    return runWithTimeout(
      signal => handler(event, { signal }),
      {
        timeoutMs: gate.timeoutMs,
        onTimeout: () => openApiBizFail(event, 504, 'API_TIMEOUT', '接口处理超时')
      }
    )
  })
}

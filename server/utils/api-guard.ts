/**
 * API guard rule chain.
 *
 * The guard checks API availability, optional API key auth, memory rate limits,
 * daily quota, and credit balance before a public API handler runs.
 */

import type { H3Event } from 'h3'
import { getHeader, getQuery, getRequestIP } from 'h3'
import { and, eq, gte } from 'drizzle-orm'
import { apiCallStats, apiKeys, users } from '@nuxthub/db/schema'
import type { RateLimitWindow } from '~~/shared/config/api-guard'
import { API_GUARD_ERROR } from '~~/shared/config/api-guard'
import type { EndpointMatch, GateOutcome, RateLimitResult } from '~~/shared/types/api-guard'
import { getRateLimiter } from '~~/server/utils/rate-limit/memory'
import { getLocalDayStart } from '~~/server/utils/local-time'
import { ipInAnyCidr } from '~~/shared/utils/cidr'
import { apiKeyService } from '~~/server/services/api-key-service'
import { toNumber } from '~~/server/utils/number'
import { firstRow } from '~~/server/utils/row'
import { readQueryString } from '~~/server/utils/request-query'

type ApiRecord = typeof import('@nuxthub/db/schema').apis.$inferSelect
type ApiKeyRecord = typeof apiKeys.$inferSelect
type ErrorDef = { status: number, code: string, msg: string }

export interface ApiKeyQuotaReservation {
  apiKeyId: number
  amount: number
}

export interface GateDeniedHeaders {
  [key: string]: string
}

export type GateResult
  = | {
    passed: true
    outcome: 'passed'
    apiKey: ApiKeyRecord | null
    quotaReservation: ApiKeyQuotaReservation | null
    rateLimitHeaders: GateDeniedHeaders
  }
  | {
    passed: false
    outcome: GateOutcome
    error: ErrorDef
    headers?: GateDeniedHeaders
    detail?: Record<string, unknown>
    apiKey: ApiKeyRecord | null
  }

const QUOTA_CACHE_TTL_MS = 1_000
const quotaCache = new Map<number, { value: number, expiresAt: number }>()

function readApiKeyFromEvent(event: H3Event): string {
  const headerKey = (getHeader(event, 'x-api-key') || '').toString().trim()
  if (headerKey) return headerKey
  const query = getQuery(event)
  return readQueryString(query.apikey).trim()
}

function hasScope(scopes: string[] | null | undefined, api: ApiRecord): boolean {
  if (!scopes || scopes.length === 0) return true
  const needed = [`${api.pathVersion}.${api.code}`, api.code, '*']
  return scopes.some(s => needed.includes(s))
}

async function loadApiKey(rawKey: string): Promise<ApiKeyRecord | null> {
  if (!rawKey) return null
  const res = await db.select().from(apiKeys).where(eq(apiKeys.apiKey, rawKey)).limit(1)
  return firstRow(res)
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
  const primary = results.reduce((min, cur) => (cur.remaining < min.remaining ? cur : min))
  return {
    'X-RateLimit-Limit': String(primary.limit),
    'X-RateLimit-Remaining': String(Math.max(primary.remaining, 0)),
    'X-RateLimit-Reset': String(Math.ceil(primary.resetAtMs / 1_000)),
    'X-RateLimit-Window': primary.window
  }
}

async function checkRateLimit(
  api: ApiRecord,
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
      console.error('[api-guard] memory rate limiter error', {
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
  effectiveCost: number
}

export async function runApiGuard({ event, api, match: _match, effectiveCost }: RunGuardInput): Promise<GateResult> {
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

  return {
    passed: true,
    outcome: 'passed',
    apiKey,
    quotaReservation,
    rateLimitHeaders: rateLimitHeaders(rateResult)
  }
}

import type { RateLimitWindow } from '../config/api-access'

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAtMs: number
  limit: number
  window: RateLimitWindow
}

export interface RateLimiter {
  readonly name: 'memory' | 'redis'
  consume(key: string, limit: number, window: RateLimitWindow): Promise<RateLimitResult>
}

export type GateOutcome
  = | 'passed'
    | 'missing_api_key'
    | 'invalid_api_key'
    | 'disabled_api_key'
    | 'expired_api_key'
    | 'scope_denied'
    | 'ip_denied'
    | 'rate_limited'
    | 'rate_limit_unavailable'
    | 'api_key_quota_exceeded'
    | 'credits_unavailable'
    | 'insufficient_credits'

interface ApiStatsTarget {
  routeId: string
  targetName: string
  apiPath: string
}

export interface ApiStatsTracked {
  startedAt: number
  pathname: string
  method: string
  ip: string | null
  requestSize: number | null
  userAgent: string | null
  referer: string | null
  queryString: string | null
  ignoredStatisticsStatusCodes?: number[]
}

interface ApiKeyContext {
  id: number
  userId: number
  name: string
}

export interface ApiCreditReservationContext {
  id: number
  userId: number
  amount: number
}

interface ApiBillingContext {
  costCredits: number
  apiKeyUserId: number | null
  creditReservation: ApiCreditReservationContext | null
}

interface ApiGateRejectionContext {
  outcome: GateOutcome
  errorCode: string
  errorMessage: string
  apiKeyId: number | null
  apiKeyName: string | null
  apiKeyUserId: number | null
}

interface ApiFailureContext {
  errorCode: string
  errorMessage: string | null
}

export interface AppEventContext {
  apiStatsTarget?: ApiStatsTarget
  apiStatsTracked?: ApiStatsTracked
  apiKey?: ApiKeyContext | null
  apiBilling?: ApiBillingContext
  apiGateRejection?: ApiGateRejectionContext
  apiFailure?: ApiFailureContext
  requestId?: string
}

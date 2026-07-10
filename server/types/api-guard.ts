import type { RateLimitWindow } from '../config/api-guard'
import type { apis } from '../db/schema'

type ApiRecord = typeof apis.$inferSelect

export interface ManifestEndpoint {
  apiPath: string
  method: string
  sourceFile: string
  paramNames: string[]
  isCatchAll: boolean
  patternRegex: string
}

export interface ManifestApi {
  pathVersion: string
  code: string
  endpoints: ManifestEndpoint[]
}

export interface EndpointMatch {
  endpoint: ManifestEndpoint
  params: Record<string, string>
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAtMs: number
  limit: number
  window: RateLimitWindow
}

export interface RateLimiter {
  readonly name: 'memory'
  consume(key: string, limit: number, window: RateLimitWindow): Promise<RateLimitResult>
}

export type GateOutcome
  = | 'passed'
    | 'not_registered'
    | 'disabled'
    | 'method_not_allowed'
    | 'missing_api_key'
    | 'invalid_api_key'
    | 'disabled_api_key'
    | 'expired_api_key'
    | 'scope_denied'
    | 'ip_denied'
    | 'rate_limited'
    | 'quota_exceeded'
    | 'api_key_quota_exceeded'
    | 'insufficient_credits'

export interface ApiStatsTarget {
  apiId: number
  apiPath: string
  pathVersion: string
  code: string
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
}

interface ApiMetaContext {
  api: ApiRecord
  manifest: ManifestApi
  endpoint: ManifestEndpoint
  params: Record<string, string>
  startedAt: number
}

interface ApiKeyContext {
  id: number
  userId: number
  name: string
  scopes: string[] | null
}

interface ApiKeyQuotaReservationContext {
  apiKeyId: number
  amount: number
}

interface ApiBillingContext {
  costCredits: number
  apiKeyUserId: number | null
  apiKeyQuotaReservation: ApiKeyQuotaReservationContext | null
  forcedOutcome: 'success' | 'failed' | null
  failedCode: string | null
  failedMessage: string | null
}

interface ApiGateRejectionContext {
  outcome: GateOutcome
  errorCode: string
  errorMessage: string
  apiKeyId: number | null
  apiKeyName: string | null
  apiKeyUserId: number | null
}

declare module 'h3' {
  interface H3EventContext {
    apiStatsTarget?: ApiStatsTarget
    apiStatsTracked?: ApiStatsTracked
    apiMeta?: ApiMetaContext
    apiKey?: ApiKeyContext | null
    apiBilling?: ApiBillingContext
    apiGateRejection?: ApiGateRejectionContext
    requestId?: string
  }
}

import type { RateLimitWindow } from '../config/apiGuard'

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

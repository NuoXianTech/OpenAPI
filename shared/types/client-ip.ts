export const CLIENT_IP_SOURCES = [
  'direct',
  'cloudflare',
  'x_forwarded_for'
] as const

export type ClientIpSource = typeof CLIENT_IP_SOURCES[number]
export type ClientIpConfigManager = 'database' | 'environment'

export type ClientIpResolutionReason
  = | 'direct'
    | 'trusted_proxy'
    | 'untrusted_proxy'
    | 'missing_header'
    | 'invalid_header'
    | 'insufficient_forwarded_hops'
    | 'peer_unavailable'

export interface EffectiveClientIpConfig {
  source: ClientIpSource
  trustedProxyCidrs: string[]
  forwardedHops: number
  managedBy: ClientIpConfigManager
  safeFallback: boolean
}

export interface AdminClientIpStatus {
  effective: EffectiveClientIpConfig
  request: {
    peerIp: string | null
    clientIp: string | null
    reason: ClientIpResolutionReason
    cfConnectingIp: string | null
    xForwardedFor: string | null
  }
}

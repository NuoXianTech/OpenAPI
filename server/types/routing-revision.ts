interface RoutingRevisionTarget {
  id: string
  baseUrl: string
  weight: number
}

export interface RoutingRevisionUpstream {
  id: string
  kind: 'internal' | 'external'
  loadBalancing: 'round_robin' | 'weighted'
  targets: RoutingRevisionTarget[]
}

export interface RoutingRevisionRoute {
  id: string
  productId: string
  productSlug: string
  versionId: string
  version: string
  name: string
  hosts: string[]
  method: string
  pathPattern: string
  normalizedShape: string
  upstreamServiceId: string
  upstreamPathTemplate: string
  isApiKey: boolean
  isStatistics: boolean
  creditsCost: number
  rateLimitPerSecond: number
  rateLimitPerMinute: number
  rateLimitPerHour: number
  rateLimitPerDay: number
  timeoutMs: number
  maxRequestBytes: number
  maxResponseBytes: number
}

export interface RoutingRevisionPayload {
  schemaVersion: 1
  revisionId: string
  environmentId: string
  generatedAt: string
  routes: RoutingRevisionRoute[]
  upstreams: RoutingRevisionUpstream[]
}

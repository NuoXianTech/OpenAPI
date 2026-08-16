import type {
  ServiceConnectionView,
  ServiceEndpointSummary
} from '#shared/types/service-control'

export interface PlatformEnvironment {
  id: string
  workspaceId: string
  slug: string
  name: string
  defaultDomain: string | null
  activeRevisionId: string | null
  status: 'active' | 'disabled'
  createdAt: string
  updatedAt: string
}

export interface PlatformWorkspace {
  id: string
  slug: string
  name: string
  status: 'active' | 'disabled'
  createdAt: string
  updatedAt: string
  environments: PlatformEnvironment[]
}

export interface PlatformApiVersion {
  id: string
  productId: string
  version: string
  state: 'draft' | 'published' | 'deprecated' | 'retired'
  changelog: string
  createdAt: string
  publishedAt: string | null
  deprecatedAt: string | null
  retiredAt: string | null
}

export interface PlatformProduct {
  id: string
  workspaceId: string
  slug: string
  name: string
  summary: string
  description: string
  categoryId: number | null
  visibility: 'public' | 'private'
  lifecycle: 'active' | 'deprecated' | 'retired'
  createdAt: string
  updatedAt: string
  versions: PlatformApiVersion[]
}

export interface PlatformUpstreamTarget {
  id: string
  upstreamServiceId: string
  baseUrl: string
  weight: number
  enabled: boolean
  configurationRevision: number | null
  configurationHash: string | null
  configurationStatus: 'unknown' | 'synced' | 'drifted' | 'error'
  lastConfigurationSyncAt: string | null
  lastError: string | null
  createdAt: string
  updatedAt: string
}

export interface PlatformUpstream {
  id: string
  workspaceId: string
  slug: string
  name: string
  kind: 'internal' | 'external'
  protocol: 'http' | 'https'
  loadBalancing: 'round_robin' | 'weighted'
  status: 'active' | 'disabled'
  createdAt: string
  updatedAt: string
  targets: PlatformUpstreamTarget[]
  connection: ServiceConnectionView | null
}

interface PlatformRoute {
  id: string
  apiVersionId: string
  name: string
  hosts: string[]
  method: 'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
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
  catalogStatus: 'automatic' | 'maintenance'
  sensitiveQueryParameters: string[]
  managedBy: 'manual' | 'service'
  isSupportRoute: boolean
  state: 'draft' | 'active' | 'disabled'
  createdAt: string
  updatedAt: string
}

export interface PlatformRouteBinding {
  route: PlatformRoute
  version: PlatformApiVersion
  product: PlatformProduct
  upstream: PlatformUpstream
}

type PlatformEndpointPublicationStatus
  = | 'available'
    | 'live'
    | 'pending'
    | 'retiring'
    | 'disabled'

export interface PlatformEndpointCatalogItem {
  key: string
  sourceKind: 'discovered' | 'manual' | 'missing'
  endpoint: ServiceEndpointSummary | null
  route: PlatformRouteBinding | null
  status: PlatformEndpointPublicationStatus
  publishable: boolean
}

export interface PlatformEndpointCatalogService {
  upstream: PlatformUpstream
  endpoints: PlatformEndpointCatalogItem[]
}

export interface PlatformEndpointCatalog {
  workspaceId: string
  environmentId: string
  activeRevisionId: string | null
  activeRevisionSequence: number | null
  services: PlatformEndpointCatalogService[]
  totals: {
    discovered: number
    live: number
    available: number
    pending: number
    disabled: number
  }
}

export interface PlatformEndpointPublicationResult {
  route: PlatformRoute
  revision: PlatformRoutingRevision | null
  applied: boolean
  publicationError: {
    code: string
    message: string
  } | null
  created?: boolean
}

interface PlatformRoutingRevisionPayload {
  schemaVersion: 1
  revisionId: string
  environmentId: string
  generatedAt: string
  routes: Array<{ id: string }>
  upstreams: Array<{ id: string }>
}

export interface PlatformRoutingRevision {
  id: string
  workspaceId: string
  environmentId: string
  sequence: number
  status: 'building' | 'published' | 'failed' | 'superseded'
  configPayload: PlatformRoutingRevisionPayload
  checksum: string
  createdBy: number | null
  createdAt: string
  publishedAt: string | null
  failureReason: string | null
}

export type {
  ServiceConfigurationField,
  ServiceConfigurationSyncResult,
  ServiceConfigurationValue,
  ServiceConfigurationView
} from '#shared/types/service-control'

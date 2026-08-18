import type { ServiceConfigurationValue } from '#shared/service-control'

export type {
  RedactedServiceConfigurationState,
  ServiceConfigurationDefinition,
  ServiceConfigurationField,
  ServiceConfigurationGroup,
  ServiceConfigurationOption,
  ServiceConfigurationValue,
  ServiceDescription
} from '#shared/service-control'

export type ServiceConfigurationScalar
  = Exclude<ServiceConfigurationValue, string[]>

export interface StoredServiceConfigurationValues {
  values: Record<string, ServiceConfigurationValue>
  secrets: Record<string, string>
}

export interface ServiceEndpointSummary {
  method: string
  path: string
  operationId: string | null
  summary: string | null
  tags: string[]
  system: boolean
  support: boolean
}

export interface ServiceTargetControlState {
  id: string
  baseUrl: string
  enabled: boolean
  availability: ServiceTargetAvailability
  configurationRevision: number | null
  configurationHash: string | null
  configurationStatus: 'unknown' | 'synced' | 'drifted' | 'error'
  configurationState: RedactedServiceConfigurationState | null
  lastConfigurationSyncAt: string | null
  lastError: string | null
}

export type ServiceAvailability = 'online' | 'degraded' | 'offline' | 'unknown'
export type ServiceTargetAvailability = 'online' | 'offline' | 'unknown'

export interface ServiceConnectionView {
  upstreamServiceId: string
  discovered: boolean
  availability: ServiceAvailability
  tokenConfigured: boolean
  serviceId: string | null
  serviceName: string | null
  serviceVersion: string | null
  serviceCommit: string | null
  platformProtocol: string | null
  openapiSha256: string | null
  configurationSchemaSha256: string | null
  configurationRevision: number
  configurationHash: string | null
  lastDiscoveredAt: string | null
  lastConfigurationSyncAt: string | null
  lastDiscoveryError: string | null
}

export interface ServiceConfigurationView {
  connection: ServiceConnectionView
  definition: ServiceConfigurationDefinition | null
  values: Record<
    string,
    ServiceConfigurationValue | { configured: boolean }
  >
  targets: ServiceTargetControlState[]
  endpoints: ServiceEndpointSummary[]
}

export interface ServiceConfigurationSyncResult {
  status: 'synced' | 'partial' | 'failed'
  revision: number
  configurationHash: string
  targets: ServiceTargetControlState[]
}

export type ServiceConfigurationScalar = boolean | number | string
export type ServiceConfigurationValue
  = | ServiceConfigurationScalar
    | string[]

export interface ServiceConfigurationOption {
  label: string
  value: string
  description?: string
}

interface ServiceConfigurationFieldBase {
  key: string
  label: string
  description?: string
  required?: boolean
}

export type ServiceConfigurationField
  = | (ServiceConfigurationFieldBase & {
    type: 'boolean'
    default: boolean
  })
  | (ServiceConfigurationFieldBase & {
    type: 'text' | 'textarea'
    default: string
    placeholder?: string
    minLength?: number
    maxLength?: number
  })
  | (ServiceConfigurationFieldBase & {
    type: 'secret'
    placeholder?: string
    minLength?: number
    maxLength?: number
  })
  | (ServiceConfigurationFieldBase & {
    type: 'number'
    default: number
    minimum?: number
    maximum?: number
    step?: number
  })
  | (ServiceConfigurationFieldBase & {
    type: 'single-select'
    default: string
    options: ServiceConfigurationOption[]
  })
  | (ServiceConfigurationFieldBase & {
    type: 'multi-select'
    default: string[]
    options: ServiceConfigurationOption[]
  })

export interface ServiceConfigurationGroup {
  key: string
  label: string
  description?: string
  fields: ServiceConfigurationField[]
}

export interface ServiceConfigurationDefinition {
  schemaVersion: 1
  groups: ServiceConfigurationGroup[]
}

export interface ServiceDescription {
  schemaVersion: 1
  serviceId: string
  name: string
  version: string
  commit: string
  openapi: string
  openapiSha256: string
  health: string
  readiness: string
  configuration: {
    schema: string
    state: string
    update: string
    schemaSha256: string
  }
  platformProtocol: 'openapi-platform-service/v1'
}

export interface RedactedServiceConfigurationState {
  schemaVersion: 1
  serviceId: string
  schemaSha256: string
  revision: number
  configurationSha256: string
  values: Record<
    string,
    ServiceConfigurationValue | { configured: boolean }
  >
  updatedAt: string | null
}

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
  configurationRevision: number | null
  configurationHash: string | null
  configurationStatus: 'unknown' | 'synced' | 'drifted' | 'error'
  configurationState: RedactedServiceConfigurationState | null
  lastConfigurationSyncAt: string | null
  lastError: string | null
}

export type ServiceAvailability = 'online' | 'degraded' | 'offline' | 'unknown'

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

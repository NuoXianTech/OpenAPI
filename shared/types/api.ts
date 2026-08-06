export interface ApiCatalogItem {
  id: number
  name: string
  status: number
  categoryId: number | null
  shortDesc: string
  description: string
  httpMethod: string
  apiPath: string
  docUrl: string
  isApiKey: boolean
  methodCosts: Record<string, number>
  totalCalls: number
}

export interface ApiCategoryItem {
  id: number
  code: string
  name: string
  icon?: string | null
  color?: string | null
  sortOrder: number
  isEnabled: boolean
}

export type ExpiryPreset = 'never' | '1h' | '1d' | '1mo' | 'custom'

export interface ApiKeyItem {
  id: number
  name: string
  apiKey: string
  isActive: boolean
  scopes: string[] | null
  ipWhitelist: string[] | null
  totalQuota: number | null
  usedCredits: number | string
  totalCalls: number
  lastUsedAt: string | null
  lastUsedIp: string | null
  expiresAt: string | null
  createdAt: string
}

export interface ApiKeyScopeOption {
  id: number
  scope: string
  code: string
  pathVersion: string
  name: string
  apiPath: string
  categoryId: number | null
  httpMethod: string
}

export interface ApiKeyFormModel {
  name: string
  expiryPreset: ExpiryPreset
  expiresAtCustom: string
  count: number
  unlimitedQuota: boolean
  totalQuota: number | null
  scopesMode: 'all' | 'pick'
  scopesSelected: string[]
  ipWhitelistText: string
}

export interface ApiKeyPayload {
  name: string
  expiresAt: string | null
  totalQuota: number | null
  scopes: string[] | null
  ipWhitelist: string[] | null
}

export interface DiscoveredEndpoint {
  apiPath: string
  method: string
  sourceFile: string
  isDynamic: boolean
}

export interface RegisteredApi {
  id: number
  code: string
  pathVersion: string
  name: string
  shortDesc: string
  description: string
  apiPath: string
  httpMethod: string
  endpointCount: number
  docUrl: string
  status: number
  categoryId: number | null
  isEnabled: boolean
  isApiKey: boolean
  isStatistics: boolean
  rateLimitPerSecond: number
  rateLimitPerMinute: number
  rateLimitPerHour: number
  rateLimitPerDay: number
  dailyQuota: number
  methodCosts: Record<string, number>
  timeoutMs: number
}

export interface DiscoveredApi {
  pathVersion: string
  code: string
  endpointCount: number
  endpoints: DiscoveredEndpoint[]
  registered: RegisteredApi | null
  orphaned: boolean
  hasCapabilities: boolean
}

export interface AdminApiFormState {
  name: string
  shortDesc: string
  description: string
  docUrl: string
  status: number
  categoryId: number | null
  isEnabled: boolean
  isApiKey: boolean
  isStatistics: boolean
  rateLimitPerSecond: number
  rateLimitPerMinute: number
  rateLimitPerHour: number
  rateLimitPerDay: number
  dailyQuota: number
  methodCosts: Record<string, number>
  timeoutMs: number
}

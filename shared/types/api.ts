export interface ApiCatalogItem {
  id: string
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
  id: string
  scope: string
  name: string
  apiPath: string
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

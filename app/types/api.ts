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
  /** 按 HTTP 方法粒度的扣费表。键为大写方法名，值为积分（0 / 缺失 = 该方法免费）。 */
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

// ============================================================
// API Keys（用户密钥管理 · user 与 admin 两端共用）
// ============================================================

/** 过期时间预设；'custom' 走 datetime-local 自定义 */
export type ExpiryPreset = 'never' | '1h' | '1d' | '1mo' | 'custom'

/** 列表行 / 详情：与 server `apiKeys` 表的可见字段一一对应 */
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
  revokedAt: string | null
  createdAt: string
}

/** “接口范围”下拉项,来自 /api/{user|admin}/apis-list */
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

/** 创建/编辑表单的本地状态;由 useApiKeyForm 持有,ApiKeyFormFields 受控渲染 */
export interface ApiKeyFormModel {
  name: string
  expiryPreset: ExpiryPreset
  expiresAtCustom: string
  /** 仅创建时有意义:批量生成数量 1-5 */
  count: number
  unlimitedQuota: boolean
  totalQuota: number | null
  scopesMode: 'all' | 'pick'
  scopesSelected: string[]
  ipWhitelistText: string
}

/** 提交给后端的配置载荷(创建时调用方再补 count) */
export interface ApiKeyPayload {
  name: string
  expiresAt: string | null
  totalQuota: number | null
  scopes: string[] | null
  ipWhitelist: string[] | null
}

export type AdminLogType = 'consume' | 'error'

export const ADMIN_LOG_TYPES: AdminLogType[] = ['consume', 'error']

export interface AdminLogRow {
  id: number
  type: AdminLogType
  createdAt: string
  userId: number | null
  userName: string | null
  apiKeyId: number | null
  apiKeyName: string | null
  requestId: string | null
  apiId: number | null
  apiName: string | null
  apiPath: string
  categoryId: number | null
  categoryName: string | null
  method: string
  statusCode: number
  latencyMs: number
  cost: number
  isCounted: boolean
  errorCode: string | null
  errorMessage: string | null
  queryString: string | null
  ip: string | null
  userAgent: string | null
  referer: string | null
  requestSize: number | null
  responseSize: number | null
}

export interface AdminLogsListResponse {
  items: AdminLogRow[]
  total: number
}

export interface AdminLogsFilterOptions {
  apis: Array<{ id: number, name: string, apiPath: string }>
  categories: Array<{ id: number, name: string }>
}

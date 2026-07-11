import type { DashboardCallRankItem } from './dashboard'

export interface AdminDashboardHourlyPoint {
  hour: string
  label: string
  totalCalls: number
}

export interface AdminDashboardInsightsData {
  hourlyTrend24h: AdminDashboardHourlyPoint[]
  ranking: DashboardCallRankItem[]
}

interface AdminDashboardOverview {
  userCount: number
  enabledApiCount: number
  totalApiCount: number
  totalCalls: number
  successCalls: number
  failureCalls: number
  successRate: number
  todayCalls: number
  yesterdayCalls: number
  todayChangeRate: number
}

export interface AdminDashboardTrendPoint {
  date: string
  totalCalls: number
  successCalls: number
  failureCalls: number
}

export interface AdminDashboardDistributionItem {
  apiId: number
  name: string
  apiPath: string
  totalCalls: number
}

export interface AdminDashboardRecentCall {
  id: number
  apiName: string
  apiPath: string
  method: string
  statusCode: number
  errorCode: string | null
  isCounted: boolean
  latencyMs: number
  createdAt: string
}

export interface AdminDashboardData {
  overview: AdminDashboardOverview
  trend: AdminDashboardTrendPoint[]
  distribution: AdminDashboardDistributionItem[]
  recentCalls: AdminDashboardRecentCall[]
  generatedAt: string
}

export type AdminDashboardRange = 7 | 14 | 30

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

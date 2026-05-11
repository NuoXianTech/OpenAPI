export interface AdminDashboardOverview {
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

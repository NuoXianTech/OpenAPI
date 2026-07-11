import type { DashboardCallRankItem } from './dashboard'

export interface PublicCallStatsOverview {
  totalCalls: number
  todayCalls: number
  yesterdayCalls: number
  successCalls: number
  failureCalls: number
  successRate: number
  userCount: number
  enabledTrackedApiCount: number
  trackedApiCount: number
}

export interface PublicCallStatsTrendPoint {
  date: string
  totalCalls: number
  successCalls: number
  failureCalls: number
}

export interface PublicCallStatsDashboard {
  overview: PublicCallStatsOverview
  trend7d: PublicCallStatsTrendPoint[]
  rankingLast30d: DashboardCallRankItem[]
  generatedAt: string
}

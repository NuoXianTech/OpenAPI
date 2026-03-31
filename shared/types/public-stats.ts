export interface PublicCallStatsOverview {
  totalCalls: number
  successCalls: number
  failureCalls: number
  successRate: number
  trackedApiCount: number
}

export interface PublicCallStatsTrendPoint {
  date: string
  totalCalls: number
  successCalls: number
  failureCalls: number
}

export interface PublicCallStatsTopItem {
  rank: number
  apiListId: number
  name: string
  apiPath: string
  httpMethod: string
  totalCalls: number
  successCalls: number
  failureCalls: number
  successRate: number
}

export interface PublicCallStatsDashboard {
  overview: PublicCallStatsOverview
  trend7d: PublicCallStatsTrendPoint[]
  top10Today: PublicCallStatsTopItem[]
  generatedAt: string
}

export interface PublicCallStatsResponse {
  code: number
  msg: string
  data: PublicCallStatsDashboard
  timestamp: number
}

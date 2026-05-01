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

export interface PublicCallStatsTopItem {
  rank: number
  apiId: number
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
  top10Last30d: PublicCallStatsTopItem[]
  generatedAt: string
}

export interface PublicCallStatsResponse {
  code: number
  msg: string
  data: PublicCallStatsDashboard
  timestamp: number
}

export interface AdminAnalyticsOverview {
  enabledApiCount: number
  totalEnabledApiCount: number
  totalCreditsSpent: number
  averageDailyCalls: number
  averageWindowDays: number
}

export interface AdminAnalyticsDistributionItem {
  apiId: number
  name: string
  apiPath: string
  totalCalls: number
  successCalls: number
  failureCalls: number
}

export interface AdminAnalyticsHourlyPoint {
  hour: string
  label: string
  totalCalls: number
}

export interface AdminAnalyticsCallBucket {
  label: string
  apiCount: number
}

export interface AdminAnalyticsRankItem {
  rank: number
  apiId: number
  name: string
  apiPath: string
  totalCalls: number
  successRate: number
}

export interface AdminAnalyticsData {
  overview: AdminAnalyticsOverview
  distribution: AdminAnalyticsDistributionItem[]
  hourlyTrend24h: AdminAnalyticsHourlyPoint[]
  callBuckets: AdminAnalyticsCallBucket[]
  ranking: AdminAnalyticsRankItem[]
  generatedAt: string
}

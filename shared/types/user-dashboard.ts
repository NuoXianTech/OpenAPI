export interface UserDashboardCredits {
  balance: number
  totalSpent: number
  spent24h: number
}

export interface UserDashboardCalls {
  total: number
  success: number
  failure: number
  successRate: number
  requests24h: number
}

export interface UserDashboardApiKeys {
  total: number
  active: number
}

export interface UserDashboardTrendPoint {
  date: string
  totalCalls: number
  creditsSpent: number
}

export interface UserDashboardData {
  credits: UserDashboardCredits
  calls: UserDashboardCalls
  apiKeys: UserDashboardApiKeys
  trend: UserDashboardTrendPoint[]
  generatedAt: string
}

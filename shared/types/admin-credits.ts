export interface AdminCreditOverviewSummary {
  totalBalance: number
  userCount: number
  usersWithBalance: number
  averageBalance: number
  income24h: number
  expense24h: number
  netChange24h: number
  transactionCount24h: number
  activeRedemptionCodes: number
  redemptionPotential: number
}

export interface AdminCreditRecentTransaction {
  id: number
  userId: number | null
  userName: string | null
  userRole: 'user' | 'admin' | null
  amount: number
  balanceAfter: number
  reason: string
  operatorName: string | null
  remark: string | null
  createdAt: string
}

export interface AdminCreditOverview {
  generatedAt: string
  summary: AdminCreditOverviewSummary
  recentTransactions: AdminCreditRecentTransaction[]
}

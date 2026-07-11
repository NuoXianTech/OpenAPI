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

export interface AdminCreditUser {
  id: number
  username: string
  role: 'user' | 'admin'
  displayName: string | null
  email: string
  credits: number
  isActive: boolean
  isBanned: boolean
  createdAt: string
}

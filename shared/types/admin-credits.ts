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

export type CreditReservationStatus = 'active' | 'pending' | 'dead_letter'

export interface CreditReservationItem {
  id: number
  userId: number
  username: string | null
  apiKeyId: number
  apiKeyName: string | null
  routeId: string
  routeName: string | null
  routePath: string | null
  apiCallId: number | null
  requestId: string
  amount: number
  status: CreditReservationStatus
  attempts: number
  lastError: string | null
  lastAttemptAt: string | null
  nextAttemptAt: string
  createdAt: string
  updatedAt: string
}

export interface AdminCreditTransactionRow {
  id: number
  userId: number | null
  userName: string | null
  userRole: 'user' | 'admin' | null
  amount: number
  balanceAfter: number
  reason: string
  routeId: string | null
  apiCallId: number | null
  codeId: number | null
  operatorId: number | null
  operatorName: string | null
  ip: string | null
  remark: string | null
  meta: Record<string, unknown> | null
  createdAt: string
}

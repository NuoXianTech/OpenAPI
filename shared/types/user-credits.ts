export interface UserCreditReasonSummary {
  reason: string
  count: number
  sum: number
}

export interface UserCreditConsumptionDailyRow {
  date: string
  consumedCredits: number
  transactionCount: number
}

export interface UserCreditSummary {
  balance: number
  totalIn: number
  totalOut: number
  totalCount: number
  byReason: UserCreditReasonSummary[]
  consumptionLast7Days: UserCreditConsumptionDailyRow[]
}

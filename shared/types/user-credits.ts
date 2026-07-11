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

export interface UserCheckinCalendarDay {
  date: string
  amount: number
  checkinCount: number
}

export interface UserCheckinCalendarMonth {
  month: string
  checkedDayCount: number
  totalAmount: number
  days: UserCheckinCalendarDay[]
}

import type { CreditReasonFilter } from '#shared/types/credit-reason'
import type { UserCheckinCalendarMonth, UserCreditSummary } from '#shared/types/user-credits'
import { usePrivateResource } from '~/composables/dashboard/use-private-resource'
import { usePrivatePagedList } from '~/composables/dashboard/use-private-paged-list'

export { creditReasonLabel as reasonLabel, creditReasonColor as reasonColor } from '#shared/types/credit-reason'
export type { UserCreditSummary as CreditSummary } from '#shared/types/user-credits'

export interface TransactionRow {
  id: number
  amount: number
  balanceAfter: number
  reason: string
  apiId: number | null
  apiName: string | null
  apiPath: string | null
  apiCallId: number | null
  codeId: number | null
  code: string | null
  operatorName: string | null
  remark: string | null
  createdAt: string
}

export interface RedeemRecord {
  id: number
  codeId: number
  code: string | null
  amount: number
  redeemedAt: string
  note: string | null
}

export interface CheckinStatus {
  enabled: boolean
  canCheckin: boolean
  reason: 'DISABLED' | 'COOLDOWN' | 'OK'
  lastCheckinAt: string | null
  nextCheckinAt: string | null
  cooldownMode: 'hours' | 'fixed_time'
  refreshHours: number
  fixedRefreshTime: string
  mode: 'fixed' | 'range'
  amountFixed: number
  amountMin: number
  amountMax: number
  requiresTurnstile: boolean
}

interface CheckinResult {
  amount: number
  balanceAfter: number
  checkedAt: string
  nextCheckinAt: string
}

type CreditDirection = 'all' | 'in' | 'out'

interface CreditTxnFilters extends Record<string, unknown> {
  reason: CreditReasonFilter
  direction: CreditDirection
}

function createEmptyCreditSummary(): UserCreditSummary {
  return {
    balance: 0,
    totalIn: 0,
    totalOut: 0,
    totalCount: 0,
    byReason: [],
    consumptionLast7Days: []
  }
}

export function useUserCreditsPage() {
  const toast = useToast()

  const {
    data: summary,
    loading: summaryLoading,
    refresh: fetchSummary
  } = usePrivateResource<UserCreditSummary>({
    path: '/api/user/credits/summary',
    defaultData: createEmptyCreditSummary,
    immediate: false
  })

  // 交易流水分页：私有数据统一走 usePrivatePagedList（$fetch，不进 payload）。
  // immediate:false —— 仅「流水明细」子页挂载时自行调用 fetchTransactions 首拉，其余 tab 不触发。
  const txns = usePrivatePagedList<CreditTxnFilters, TransactionRow>({
    path: '/api/user/credits/transactions',
    defaultFilters: { reason: 'all', direction: 'all' },
    immediate: false,
    buildQuery: (f, p) => ({
      reason: f.reason === 'all' ? undefined : f.reason,
      direction: f.direction === 'all' ? undefined : f.direction,
      limit: p.limit,
      offset: p.offset
    })
  })

  const redeemRecords = ref<RedeemRecord[]>([])

  const {
    data: checkin,
    status: checkinStatus,
    refresh: fetchCheckinStatus
  } = usePrivateResource<CheckinStatus | null>({
    path: '/api/user/credits/checkin',
    defaultData: () => null,
    immediate: false
  })
  const isCheckingIn = ref(false)
  const checkinCalendar = ref<UserCheckinCalendarMonth | null>(null)
  const checkinCalendarLoading = ref(false)
  const activeCheckinMonth = ref('')
  let checkinCalendarRequestId = 0

  async function fetchCheckinCalendar(month: string) {
    const requestId = ++checkinCalendarRequestId
    activeCheckinMonth.value = month
    checkinCalendarLoading.value = true
    try {
      const data = await $fetch<UserCheckinCalendarMonth>('/api/user/credits/checkins', {
        query: { month }
      })
      if (requestId === checkinCalendarRequestId) checkinCalendar.value = data
    } catch {
      if (requestId === checkinCalendarRequestId) checkinCalendar.value = null
    } finally {
      if (requestId === checkinCalendarRequestId) checkinCalendarLoading.value = false
    }
  }

  async function fetchRedeemRecords() {
    try {
      const res = await $fetch<{ items: RedeemRecord[], total: number }>('/api/user/credits/redemptions', {
        query: { limit: 10 }
      })
      redeemRecords.value = res?.items || []
    } catch {
      redeemRecords.value = []
    }
  }

  async function performCheckin(turnstileToken?: string): Promise<CheckinResult> {
    isCheckingIn.value = true
    try {
      const res = await $fetch<CheckinResult>('/api/user/credits/checkin', {
        method: 'POST',
        body: turnstileToken ? { turnstileToken } : {}
      })
      toast.add({
        title: `签到成功 +${res.amount.toLocaleString()}`,
        description: `当前积分 ${res.balanceAfter.toLocaleString()}`,
        color: 'success'
      })
      await fetchCheckinStatus()
      if (activeCheckinMonth.value) await fetchCheckinCalendar(activeCheckinMonth.value)
      return res
    } finally {
      isCheckingIn.value = false
    }
  }

  async function redeem(code: string): Promise<{ amount: number, balanceAfter: number }> {
    const res = await $fetch<{ amount: number, balanceAfter: number }>('/api/user/credits/redeem', {
      method: 'POST',
      body: { code }
    })
    toast.add({
      title: `兑换成功 +${res.amount.toLocaleString()}`,
      description: `当前积分 ${res.balanceAfter.toLocaleString()}`,
      color: 'success'
    })
    await fetchRedeemRecords()
    return res
  }

  return {
    // 概览 tab
    summary,
    summaryLoading,
    fetchSummary,
    // 流水明细 tab
    filters: txns.filters,
    page: txns.page,
    pageSize: txns.pageSize,
    items: txns.items,
    total: txns.total,
    loading: txns.loading,
    totalPages: txns.totalPages,
    fetchTransactions: txns.refresh,
    applyFilters: txns.applyFilters,
    resetFilters: txns.reset,
    // 签到兑换 tab
    checkin,
    checkinStatus,
    isCheckingIn,
    performCheckin,
    fetchCheckinStatus,
    checkinCalendar,
    checkinCalendarLoading,
    fetchCheckinCalendar,
    redeemRecords,
    fetchRedeemRecords,
    redeem
  }
}

import type { CreditReasonFilter } from '#shared/types/credit-reason'
import { usePrivatePagedList } from '~/composables/dashboard/usePrivatePagedList'

export { creditReasonLabel as reasonLabel, creditReasonColor as reasonColor } from '#shared/types/credit-reason'

export interface CreditSummary {
  balance: number
  totalIn: number
  totalOut: number
  totalCount: number
  byReason: Array<{ reason: string, count: number, sum: number }>
}

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

export interface CheckinResult {
  amount: number
  balanceAfter: number
  checkedAt: string
  nextCheckinAt: string
}

export type CreditDirection = 'all' | 'in' | 'out'

interface CreditTxnFilters extends Record<string, unknown> {
  reason: CreditReasonFilter
  direction: CreditDirection
}

export function useUserCreditsPage() {
  const toast = useToast()

  const summary = ref<CreditSummary>({ balance: 0, totalIn: 0, totalOut: 0, totalCount: 0, byReason: [] })
  const summaryLoading = ref(false)

  // 交易流水分页：私有数据统一走 usePrivatePagedList（$fetch，不进 payload）。
  // immediate:false —— 由 init() 与 summary/签到一起并发首拉，避免重复触发。
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

  const checkin = ref<CheckinStatus | null>(null)
  const checkinLoading = ref(false)
  const isCheckingIn = ref(false)

  async function fetchSummary() {
    summaryLoading.value = true
    try {
      const res = await $fetch<CreditSummary>('/api/user/credits/summary')
      summary.value = res || { balance: 0, totalIn: 0, totalOut: 0, totalCount: 0, byReason: [] }
    } catch (err) {
      console.error('failed to load credits summary', err)
    } finally {
      summaryLoading.value = false
    }
  }

  async function fetchRedeemRecords() {
    try {
      const res = await $fetch<{ items: RedeemRecord[], total: number }>('/api/user/credits/redemptions', {
        query: { limit: 10 }
      })
      redeemRecords.value = res?.items || []
    } catch (err) {
      console.error('failed to load redemption records', err)
    }
  }

  async function fetchCheckinStatus() {
    checkinLoading.value = true
    try {
      const res = await $fetch<CheckinStatus>('/api/user/credits/checkin')
      checkin.value = res
    } catch (err) {
      console.error('failed to load checkin status', err)
      checkin.value = null
    } finally {
      checkinLoading.value = false
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
      await Promise.all([fetchSummary(), txns.refresh(), fetchCheckinStatus()])
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
    await Promise.all([fetchSummary(), txns.refresh(), fetchRedeemRecords()])
    return res
  }

  async function refreshAll() {
    await Promise.all([fetchSummary(), txns.refresh()])
  }

  async function init() {
    await Promise.all([refreshAll(), fetchRedeemRecords(), fetchCheckinStatus()])
  }

  return {
    summary,
    summaryLoading,
    filters: txns.filters,
    page: txns.page,
    pageSize: txns.pageSize,
    items: txns.items,
    total: txns.total,
    loading: txns.loading,
    totalPages: txns.totalPages,
    redeemRecords,
    checkin,
    checkinLoading,
    isCheckingIn,
    fetchTransactions: txns.refresh,
    redeem,
    performCheckin,
    fetchCheckinStatus,
    applyFilters: txns.applyFilters,
    resetFilters: txns.reset,
    refreshAll,
    init
  }
}

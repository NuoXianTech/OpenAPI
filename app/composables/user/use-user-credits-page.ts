import type { CreditReasonFilter } from '~/types/credit-reason'
import { usePrivateResource } from '~/composables/dashboard/use-private-resource'
import { usePrivatePagedList } from '~/composables/dashboard/use-private-paged-list'

export { creditReasonLabel as reasonLabel, creditReasonColor as reasonColor } from '~/types/credit-reason'

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

type CreditDirection = 'all' | 'in' | 'out'

interface CreditTxnFilters extends Record<string, unknown> {
  reason: CreditReasonFilter
  direction: CreditDirection
}

function createEmptyCreditSummary(): CreditSummary {
  return { balance: 0, totalIn: 0, totalOut: 0, totalCount: 0, byReason: [] }
}

export function useUserCreditsPage() {
  const toast = useToast()

  const {
    data: summary,
    loading: summaryLoading,
    refresh: fetchSummary
  } = usePrivateResource<CreditSummary>({
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
    loading: checkinLoading,
    refresh: fetchCheckinStatus
  } = usePrivateResource<CheckinStatus | null>({
    path: '/api/user/credits/checkin',
    defaultData: () => null,
    immediate: false
  })
  const isCheckingIn = ref(false)

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
      // 签到后只刷新本 tab 的签到状态；余额/流水分属其它 tab，重新进入时各自挂载首拉。
      await fetchCheckinStatus()
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
    // 兑换后只刷新本 tab 的兑换记录；余额/流水分属其它 tab，重新进入时各自挂载首拉。
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
    checkinLoading,
    isCheckingIn,
    performCheckin,
    fetchCheckinStatus,
    redeemRecords,
    fetchRedeemRecords,
    redeem
  }
}

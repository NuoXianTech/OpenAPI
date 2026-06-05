import type { CreditReasonFilter } from '#shared/types/credit-reason'

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

export function useUserCreditsPage() {
  const toast = useToast()

  const summary = ref<CreditSummary>({ balance: 0, totalIn: 0, totalOut: 0, totalCount: 0, byReason: [] })
  const summaryLoading = ref(false)

  const filters = reactive({
    reason: 'all' as CreditReasonFilter,
    direction: 'all' as CreditDirection
  })
  const page = ref(1)
  const pageSize = ref(50)
  const items = ref<TransactionRow[]>([])
  const total = ref(0)
  const loading = ref(false)

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

  async function fetchTransactions() {
    loading.value = true
    try {
      const res = await $fetch<{ items: TransactionRow[], total: number }>('/api/user/credits/transactions', {
        query: {
          reason: filters.reason === 'all' ? undefined : filters.reason,
          direction: filters.direction === 'all' ? undefined : filters.direction,
          limit: pageSize.value,
          offset: (page.value - 1) * pageSize.value
        }
      })
      items.value = res?.items || []
      total.value = res?.total || 0
    } catch (err) {
      console.error('failed to load transactions', err)
      items.value = []
      total.value = 0
    } finally {
      loading.value = false
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
      await Promise.all([fetchSummary(), fetchTransactions(), fetchCheckinStatus()])
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
    await Promise.all([fetchSummary(), fetchTransactions(), fetchRedeemRecords()])
    return res
  }

  function applyFilters() {
    page.value = 1
    void fetchTransactions()
  }

  function resetFilters() {
    filters.reason = 'all'
    filters.direction = 'all'
    page.value = 1
    void fetchTransactions()
  }

  async function refreshAll() {
    await Promise.all([fetchSummary(), fetchTransactions()])
  }

  watch(page, () => {
    void fetchTransactions()
  })

  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

  async function init() {
    await Promise.all([refreshAll(), fetchRedeemRecords(), fetchCheckinStatus()])
  }

  return {
    summary,
    summaryLoading,
    filters,
    page,
    pageSize,
    items,
    total,
    loading,
    redeemRecords,
    checkin,
    checkinLoading,
    isCheckingIn,
    totalPages,
    fetchTransactions,
    redeem,
    performCheckin,
    fetchCheckinStatus,
    applyFilters,
    resetFilters,
    refreshAll,
    init
  }
}

export interface WalletSummary {
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

export type WalletReason = 'all' | 'admin_grant' | 'admin_revoke' | 'admin_reset' | 'api_charge' | 'api_refund' | 'signup_bonus' | 'redemption_code'
export type WalletDirection = 'all' | 'in' | 'out'

export const REASON_META: Record<string, { label: string, color: 'success' | 'error' | 'warning' | 'info' | 'neutral' }> = {
  api_charge: { label: 'API 扣费', color: 'error' },
  api_refund: { label: 'API 退款', color: 'success' },
  redemption_code: { label: '兑换码', color: 'success' },
  admin_grant: { label: '管理员加', color: 'success' },
  admin_revoke: { label: '管理员扣', color: 'error' },
  admin_reset: { label: '管理员重置', color: 'warning' },
  signup_bonus: { label: '注册赠送', color: 'info' }
}

export function reasonLabel(reason: string) {
  return REASON_META[reason]?.label || reason
}

export function reasonColor(reason: string) {
  return REASON_META[reason]?.color || 'neutral'
}

export function useUserWalletPage() {
  const toast = useToast()

  const summary = ref<WalletSummary>({ balance: 0, totalIn: 0, totalOut: 0, totalCount: 0, byReason: [] })
  const summaryLoading = ref(false)

  const filters = reactive({
    reason: 'all' as WalletReason,
    direction: 'all' as WalletDirection
  })
  const page = ref(1)
  const pageSize = ref(50)
  const items = ref<TransactionRow[]>([])
  const total = ref(0)
  const loading = ref(false)

  const redeemRecords = ref<RedeemRecord[]>([])

  async function fetchSummary() {
    summaryLoading.value = true
    try {
      const res = await $fetch<WalletSummary>('/api/user/credits/summary')
      summary.value = res || { balance: 0, totalIn: 0, totalOut: 0, totalCount: 0, byReason: [] }
    } catch (err) {
      console.error('failed to load wallet summary', err)
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
    await Promise.all([refreshAll(), fetchRedeemRecords()])
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
    totalPages,
    fetchTransactions,
    redeem,
    applyFilters,
    resetFilters,
    refreshAll,
    init
  }
}

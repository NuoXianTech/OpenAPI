import { parseFetchError } from '#shared/utils/clientError'

export interface RedemptionCode {
  id: number
  code: string
  amount: number
  batchId: string | null
  note: string | null
  maxUses: number
  usedCount: number
  expiresAt: string | null
  isEnabled: boolean
  createdAt: string
}

export interface BatchSummary {
  batchId: string
  note: string | null
  amount: number
  total: number
  usedTotal: number
  maxUsesTotal: number
  createdAt: string
}

export type RedemptionStatus = 'all' | 'enabled' | 'disabled' | 'used_up' | 'expired' | 'available'

export interface GenerateResult {
  batchId: string
  codes: Array<{ id: number, code: string }>
  generated: number
  requested: number
}

export interface GeneratePayload {
  amount: number
  count: number
  prefix: string | null
  length: number
  maxUses: number
  expiresAt: string | null
  note: string | null
}

export function useRedemptionCodesPage() {
  const toast = useToast()

  const filters = reactive({
    status: 'all' as RedemptionStatus,
    batchId: 'all' as string,
    keyword: ''
  })
  const page = ref(1)
  const pageSize = ref(50)

  const items = ref<RedemptionCode[]>([])
  const total = ref(0)
  const loading = ref(false)
  const batches = ref<BatchSummary[]>([])

  async function fetchBatches() {
    try {
      const res = await $fetch<BatchSummary[]>('/api/admin/redemption-codes/batches')
      batches.value = res || []
    } catch (err) {
      console.error('failed to load batches', err)
    }
  }

  async function fetchList() {
    loading.value = true
    try {
      const res = await $fetch<{ items: RedemptionCode[], total: number }>('/api/admin/redemption-codes/list', {
        query: {
          status: filters.status === 'all' ? undefined : filters.status,
          batchId: filters.batchId === 'all' ? undefined : filters.batchId,
          keyword: filters.keyword || undefined,
          limit: pageSize.value,
          offset: (page.value - 1) * pageSize.value
        }
      })
      items.value = res?.items || []
      total.value = res?.total || 0
    } catch (err) {
      console.error('failed to load codes', err)
      items.value = []
      total.value = 0
    } finally {
      loading.value = false
    }
  }

  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

  function applyFilters() {
    page.value = 1
    void fetchList()
  }
  function resetFilters() {
    filters.status = 'all'
    filters.batchId = 'all'
    filters.keyword = ''
    page.value = 1
    void fetchList()
  }

  async function generate(payload: GeneratePayload): Promise<GenerateResult> {
    const res = await $fetch<GenerateResult>('/api/admin/redemption-codes/generate', {
      method: 'POST',
      body: payload
    })
    toast.add({ title: `已生成 ${res.generated} 张兑换码`, color: 'success' })
    await Promise.all([fetchBatches(), fetchList()])
    return res
  }

  async function toggle(item: RedemptionCode) {
    try {
      await $fetch('/api/admin/redemption-codes/toggle', {
        method: 'POST',
        body: { id: item.id, enabled: !item.isEnabled }
      })
      toast.add({ title: item.isEnabled ? '已禁用' : '已启用', color: 'success' })
      await fetchList()
    } catch (err) {
      toast.add({ title: parseFetchError(err, '操作失败'), color: 'error' })
    }
  }

  async function remove(item: RedemptionCode) {
    if (!confirm(`确认删除兑换码 ${item.code}？`)) return
    try {
      await $fetch('/api/admin/redemption-codes/delete', {
        method: 'POST',
        body: { id: item.id }
      })
      toast.add({ title: '已删除', color: 'success' })
      await fetchList()
    } catch (err) {
      toast.add({ title: parseFetchError(err, '删除失败'), color: 'error' })
    }
  }

  async function toggleBatch(batchId: string, enabled: boolean) {
    try {
      const res = await $fetch<{ affected: number }>('/api/admin/redemption-codes/toggle', {
        method: 'POST',
        body: { batchId, enabled }
      })
      toast.add({ title: `已${enabled ? '启用' : '禁用'} ${res.affected} 张兑换码`, color: 'success' })
      await Promise.all([fetchBatches(), fetchList()])
    } catch (err) {
      toast.add({ title: parseFetchError(err, '操作失败'), color: 'error' })
    }
  }

  async function deleteBatch(batchId: string, includeUsed: boolean) {
    const msg = includeUsed
      ? `确认删除批次 ${batchId} 的全部兑换码（含已被兑换过的）？此操作不可恢复。`
      : `确认删除批次 ${batchId} 中未被使用过的兑换码？`
    if (!confirm(msg)) return
    try {
      const res = await $fetch<{ affected: number }>('/api/admin/redemption-codes/delete', {
        method: 'POST',
        body: { batchId, includeUsed }
      })
      toast.add({ title: `已删除 ${res.affected} 张兑换码`, color: 'success' })
      await Promise.all([fetchBatches(), fetchList()])
    } catch (err) {
      toast.add({ title: parseFetchError(err, '删除失败'), color: 'error' })
    }
  }

  function copyOne(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      toast.add({ title: `已复制 ${code}`, color: 'success' })
    })
  }

  function copyAll(codes: Array<{ code: string }>) {
    const text = codes.map(c => c.code).join('\n')
    navigator.clipboard.writeText(text).then(() => {
      toast.add({ title: '已复制全部兑换码到剪贴板', color: 'success' })
    })
  }

  watch(page, () => {
    void fetchList()
  })

  async function init() {
    await Promise.all([fetchBatches(), fetchList()])
  }

  return {
    filters,
    page,
    pageSize,
    items,
    total,
    loading,
    batches,
    totalPages,
    fetchList,
    fetchBatches,
    init,
    applyFilters,
    resetFilters,
    generate,
    toggle,
    remove,
    toggleBatch,
    deleteBatch,
    copyOne,
    copyAll
  }
}

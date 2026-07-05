import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import { parseFetchError } from '#shared/utils/client-error'
import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { usePrivatePagedList } from '~/composables/dashboard/use-private-paged-list'

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

interface RedemptionFilters extends Record<string, unknown> {
  status: RedemptionStatus
  batchId: string
  keyword: string
}

export function useRedemptionCodesPage() {
  const toast = useToast()
  const confirm = useConfirmDialog()

  // 兑换码列表分页：后台敏感数据统一走 usePrivatePagedList（$fetch，不进 payload）。
  // immediate:false —— 由 init() 与 batches 一起并发首拉。
  const paged = usePrivatePagedList<RedemptionFilters, RedemptionCode>({
    path: '/api/admin/redemption-codes/list',
    defaultFilters: { status: 'all', batchId: 'all', keyword: '' },
    immediate: false,
    buildQuery: (f, p) => ({
      status: f.status === 'all' ? undefined : f.status,
      batchId: f.batchId === 'all' ? undefined : f.batchId,
      keyword: f.keyword || undefined,
      limit: p.limit,
      offset: p.offset
    })
  })

  const batches = ref<BatchSummary[]>([])

  async function fetchBatches() {
    try {
      const res = await $fetch<BatchSummary[]>('/api/admin/redemption-codes/batches')
      batches.value = res || []
    } catch (err) {
      console.error('failed to load batches', err)
    }
  }

  async function generate(payload: GeneratePayload): Promise<GenerateResult> {
    const res = await $fetch<GenerateResult>('/api/admin/redemption-codes/generate', {
      method: 'POST',
      body: payload
    })
    toast.add({ title: `已生成 ${res.generated} 张兑换码`, color: 'success' })
    await Promise.all([fetchBatches(), paged.refresh()])
    return res
  }

  async function toggle(item: RedemptionCode) {
    try {
      await $fetch('/api/admin/redemption-codes/toggle', {
        method: 'POST',
        body: { id: item.id, enabled: !item.isEnabled }
      })
      toast.add({ title: item.isEnabled ? '已禁用' : '已启用', color: 'success' })
      await paged.refresh()
    } catch (err) {
      toast.add({ title: parseFetchError(err, '操作失败'), color: 'error' })
    }
  }

  async function remove(item: RedemptionCode) {
    await confirm({
      title: `删除兑换码 ${item.code}`,
      description: '删除后该兑换码立即失效，操作不可恢复。',
      onConfirm: async () => {
        try {
          await $fetch('/api/admin/redemption-codes/delete', {
            method: 'POST',
            body: { id: item.id }
          })
          toast.add({ title: '已删除', color: 'success' })
          await paged.refresh()
        } catch (err) {
          toast.add({ title: parseFetchError(err, '删除失败'), color: 'error' })
          throw err
        }
      }
    })
  }

  async function toggleBatch(batchId: string, enabled: boolean) {
    try {
      const res = await $fetch<{ affected: number }>('/api/admin/redemption-codes/toggle', {
        method: 'POST',
        body: { batchId, enabled }
      })
      toast.add({ title: `已${enabled ? '启用' : '禁用'} ${res.affected} 张兑换码`, color: 'success' })
      await Promise.all([fetchBatches(), paged.refresh()])
    } catch (err) {
      toast.add({ title: parseFetchError(err, '操作失败'), color: 'error' })
    }
  }

  async function deleteBatch(batchId: string, includeUsed: boolean) {
    const description = includeUsed
      ? `将删除批次 ${batchId} 的全部兑换码（含已被兑换过的），此操作不可恢复。`
      : `将删除批次 ${batchId} 中未被使用过的兑换码。`
    await confirm({
      title: `删除批次 ${batchId}`,
      description,
      onConfirm: async () => {
        try {
          const res = await $fetch<{ affected: number }>('/api/admin/redemption-codes/delete', {
            method: 'POST',
            body: { batchId, includeUsed }
          })
          toast.add({ title: `已删除 ${res.affected} 张兑换码`, color: 'success' })
          await Promise.all([fetchBatches(), paged.refresh()])
        } catch (err) {
          toast.add({ title: parseFetchError(err, '删除失败'), color: 'error' })
          throw err
        }
      }
    })
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

  async function init() {
    await Promise.all([fetchBatches(), paged.refresh()])
  }

  return {
    filters: paged.filters,
    page: paged.page,
    pageSize: paged.pageSize,
    items: paged.items,
    total: paged.total,
    loading: paged.loading,
    totalPages: paged.totalPages,
    batches,
    fetchList: paged.refresh,
    fetchBatches,
    init,
    applyFilters: paged.applyFilters,
    resetFilters: paged.reset,
    generate,
    toggle,
    remove,
    toggleBatch,
    deleteBatch,
    copyOne,
    copyAll
  }
}

interface AdminRedemptionCodeSelectItem {
  label: string
  value: string
}

interface AdminRedemptionCodeFilters {
  status: RedemptionStatus
  batchId: string
  keyword: string
}

interface AdminRedemptionCodeStatusMeta {
  label: string
  color: 'success' | 'warning' | 'error' | 'neutral'
}

interface UseAdminRedemptionCodesDisplayMetaOptions {
  batches: Ref<BatchSummary[]>
  filters: AdminRedemptionCodeFilters
  applyFilters: () => void
  toggle: (row: RedemptionCode) => void | Promise<void>
  remove: (row: RedemptionCode) => void | Promise<void>
  copyOne: (code: string) => void | Promise<void>
}

interface UseAdminRedemptionCodesDisplayMetaReturn {
  statusItems: AdminRedemptionCodeSelectItem[]
  batchItems: ComputedRef<AdminRedemptionCodeSelectItem[]>
  columns: TableColumn<RedemptionCode>[]
  statusOf: (item: RedemptionCode) => AdminRedemptionCodeStatusMeta
  getRowItems: (row: RedemptionCode) => DropdownMenuItem[]
  onBatchFilter: (batchId: string) => void
}

const ADMIN_REDEMPTION_CODE_STATUS_ITEMS: AdminRedemptionCodeSelectItem[] = [
  { label: '全部', value: 'all' },
  { label: '可用', value: 'available' },
  { label: '已禁用', value: 'disabled' },
  { label: '已用完', value: 'used_up' },
  { label: '已过期', value: 'expired' }
]

const ADMIN_REDEMPTION_CODE_TABLE_COLUMNS: TableColumn<RedemptionCode>[] = [
  { accessorKey: 'code', header: '兑换码' },
  { accessorKey: 'amount', header: '面额' },
  { id: 'usage', header: '使用' },
  { accessorKey: 'note', header: '备注' },
  { accessorKey: 'expiresAt', header: '过期时间' },
  { id: 'status', header: '状态' },
  { accessorKey: 'createdAt', header: '创建时间' },
  { id: 'actions', header: '' }
]

function getAdminRedemptionCodeStatus(item: RedemptionCode): AdminRedemptionCodeStatusMeta {
  if (!item.isEnabled) return { label: '已禁用', color: 'neutral' }
  if (item.usedCount >= item.maxUses) return { label: '已用完', color: 'warning' }
  if (item.expiresAt && new Date(item.expiresAt).getTime() <= Date.now()) {
    return { label: '已过期', color: 'error' }
  }
  return { label: '可用', color: 'success' }
}

function buildAdminRedemptionCodeBatchItems(
  batches: BatchSummary[]
): AdminRedemptionCodeSelectItem[] {
  return [
    { label: '全部批次', value: 'all' },
    ...batches.map(batch => ({
      label: `${batch.batchId} (${batch.usedTotal}/${batch.maxUsesTotal} 用 · ${batch.amount} 积分)`,
      value: batch.batchId
    }))
  ]
}

export function useAdminRedemptionCodesDisplayMeta(
  options: UseAdminRedemptionCodesDisplayMetaOptions
): UseAdminRedemptionCodesDisplayMetaReturn {
  const batchItems = computed(() => buildAdminRedemptionCodeBatchItems(options.batches.value))

  function getRowItems(row: RedemptionCode): DropdownMenuItem[] {
    return [{
      label: row.isEnabled ? '禁用' : '启用',
      icon: row.isEnabled ? 'i-mdi-toggle-switch-off-outline' : 'i-mdi-toggle-switch-outline',
      onSelect: () => options.toggle(row)
    }, {
      label: '复制兑换码',
      icon: 'i-mdi-content-copy',
      onSelect: () => options.copyOne(row.code)
    }, {
      type: 'separator'
    }, {
      label: '删除',
      icon: 'i-mdi-delete-outline',
      color: 'error',
      onSelect: () => options.remove(row)
    }]
  }

  function onBatchFilter(batchId: string) {
    options.filters.batchId = batchId
    options.applyFilters()
  }

  return {
    statusItems: ADMIN_REDEMPTION_CODE_STATUS_ITEMS,
    batchItems,
    columns: ADMIN_REDEMPTION_CODE_TABLE_COLUMNS,
    statusOf: getAdminRedemptionCodeStatus,
    getRowItems,
    onBatchFilter
  }
}

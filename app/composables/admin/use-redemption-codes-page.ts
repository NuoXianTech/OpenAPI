import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import { parseFetchError } from '~/utils/client-error'
import { computed, reactive, ref, type ComputedRef, type Ref } from 'vue'
import { usePrivatePagedList } from '~/composables/dashboard/use-private-paged-list'

interface RedemptionCode {
  id: number
  codePreview: string
  amount: number
  batchId: string | null
  note: string | null
  maxUses: number
  usedCount: number
  expiresAt: string | null
  isEnabled: boolean
  createdAt: string
}

interface RevealedRedemptionCode {
  id: number
  code: string
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

type RedemptionStatus = 'all' | 'enabled' | 'disabled' | 'used_up' | 'expired' | 'available'

export interface GenerateResult {
  batchId: string
  codes: Array<{ id: number, code: string }>
  generated: number
  requested: number
}

export interface GeneratePayload {
  amount: number
  count: number
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
  const { copyText } = useCopyFeedback()
  const confirm = useConfirmDialog()
  const { t } = useI18n()

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
  const revealedCodes = ref<Record<number, string>>({})
  const revealingCodeIds = reactive(new Set<number>())

  async function fetchBatches() {
    try {
      const res = await $fetch<BatchSummary[]>('/api/admin/redemption-codes/batches')
      batches.value = res || []
    } catch {
      batches.value = []
    }
  }

  async function generate(payload: GeneratePayload): Promise<GenerateResult> {
    const res = await $fetch<GenerateResult>('/api/admin/redemption-codes/generate', {
      method: 'POST',
      body: payload
    })
    toast.add({
      title: t('admin.credits.redemptionCodes.feedback.generated', { count: res.generated }),
      color: 'success'
    })
    await Promise.all([fetchBatches(), paged.refresh()])
    return res
  }

  async function toggle(item: RedemptionCode) {
    try {
      await $fetch('/api/admin/redemption-codes/toggle', {
        method: 'POST',
        body: { id: item.id, enabled: !item.isEnabled }
      })
      toast.add({
        title: item.isEnabled
          ? t('admin.credits.redemptionCodes.feedback.disabled')
          : t('admin.credits.redemptionCodes.feedback.enabled'),
        color: 'success'
      })
      await paged.refresh()
    } catch (err) {
      toast.add({ title: parseFetchError(err, t('common.feedback.operationFailed')), color: 'error' })
    }
  }

  async function remove(item: RedemptionCode) {
    await confirm({
      title: t('admin.credits.redemptionCodes.deleteCode.title', { code: item.codePreview }),
      description: t('admin.credits.redemptionCodes.deleteCode.description'),
      onConfirm: async () => {
        try {
          await $fetch('/api/admin/redemption-codes/delete', {
            method: 'POST',
            body: { id: item.id }
          })
          toast.add({ title: t('common.feedback.deleted'), color: 'success' })
          await paged.refresh()
        } catch (err) {
          toast.add({ title: parseFetchError(err, t('common.feedback.deleteFailed')), color: 'error' })
          throw err
        }
      }
    })
  }

  async function toggleBatch(batchId: string, enabled: boolean) {
    try {
      const res = await $fetch('/api/admin/redemption-codes/toggle', {
        method: 'POST',
        body: { batchId, enabled }
      })
      toast.add({
        title: enabled
          ? t('admin.credits.redemptionCodes.feedback.batchEnabled', { count: res.affected })
          : t('admin.credits.redemptionCodes.feedback.batchDisabled', { count: res.affected }),
        color: 'success'
      })
      await Promise.all([fetchBatches(), paged.refresh()])
    } catch (err) {
      toast.add({ title: parseFetchError(err, t('common.feedback.operationFailed')), color: 'error' })
    }
  }

  async function deleteBatch(batchId: string, includeUsed: boolean) {
    const description = includeUsed
      ? t('admin.credits.redemptionCodes.deleteBatch.includeUsedDescription', { batchId })
      : t('admin.credits.redemptionCodes.deleteBatch.unusedDescription', { batchId })
    await confirm({
      title: t('admin.credits.redemptionCodes.deleteBatch.title', { batchId }),
      description,
      onConfirm: async () => {
        try {
          const res = await $fetch('/api/admin/redemption-codes/delete', {
            method: 'POST',
            body: { batchId, includeUsed }
          })
          toast.add({
            title: t('admin.credits.redemptionCodes.feedback.batchDeleted', { count: res.affected }),
            color: 'success'
          })
          await Promise.all([fetchBatches(), paged.refresh()])
        } catch (err) {
          toast.add({ title: parseFetchError(err, t('common.feedback.deleteFailed')), color: 'error' })
          throw err
        }
      }
    })
  }

  async function copyOne(code: string) {
    await copyText(code, {
      successTitle: t('admin.credits.redemptionCodes.feedback.codeCopied', { code })
    })
  }

  async function copyAll(codes: Array<{ code: string }>) {
    const text = codes.map(c => c.code).join('\n')
    await copyText(text, {
      successTitle: t('admin.credits.redemptionCodes.feedback.allCopied')
    })
  }

  async function toggleCodeVisibility(item: RedemptionCode) {
    if (revealedCodes.value[item.id]) {
      const { [item.id]: _hidden, ...remaining } = revealedCodes.value
      revealedCodes.value = remaining
      return
    }
    if (revealingCodeIds.has(item.id)) return

    revealingCodeIds.add(item.id)
    try {
      const revealed = await $fetch<RevealedRedemptionCode>(
        '/api/admin/redemption-codes/reveal',
        { method: 'POST', body: { id: item.id } }
      )
      revealedCodes.value[item.id] = revealed.code
    } catch (error) {
      toast.add({
        title: parseFetchError(
          error,
          t('admin.credits.redemptionCodes.feedback.revealFailed')
        ),
        color: 'error'
      })
    } finally {
      revealingCodeIds.delete(item.id)
    }
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
    revealedCodes,
    revealingCodeIds,
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
    copyAll,
    toggleCodeVisibility
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
}

interface UseAdminRedemptionCodesDisplayMetaReturn {
  statusItems: ComputedRef<AdminRedemptionCodeSelectItem[]>
  batchItems: ComputedRef<AdminRedemptionCodeSelectItem[]>
  columns: ComputedRef<TableColumn<RedemptionCode>[]>
  statusOf: (item: RedemptionCode) => AdminRedemptionCodeStatusMeta
  getRowItems: (row: RedemptionCode) => DropdownMenuItem[]
  onBatchFilter: (batchId: string) => void
}

export function useAdminRedemptionCodesDisplayMeta(
  options: UseAdminRedemptionCodesDisplayMetaOptions
): UseAdminRedemptionCodesDisplayMetaReturn {
  const { t, locale } = useI18n()
  const statusItems = computed<AdminRedemptionCodeSelectItem[]>(() => [
    { label: t('common.filters.all'), value: 'all' },
    { label: t('admin.credits.redemptionCodes.statuses.available'), value: 'available' },
    { label: t('admin.credits.redemptionCodes.statuses.disabled'), value: 'disabled' },
    { label: t('admin.credits.redemptionCodes.statuses.usedUp'), value: 'used_up' },
    { label: t('admin.credits.redemptionCodes.statuses.expired'), value: 'expired' }
  ])
  const batchItems = computed<AdminRedemptionCodeSelectItem[]>(() => [
    { label: t('admin.credits.redemptionCodes.filters.allBatches'), value: 'all' },
    ...options.batches.value.map(batch => ({
      label: t('admin.credits.redemptionCodes.filters.batchOption', {
        batchId: batch.batchId,
        used: batch.usedTotal.toLocaleString(locale.value),
        total: batch.maxUsesTotal.toLocaleString(locale.value),
        amount: batch.amount.toLocaleString(locale.value)
      }),
      value: batch.batchId
    }))
  ])
  const columns = computed<TableColumn<RedemptionCode>[]>(() => [
    { accessorKey: 'codePreview', header: t('admin.credits.redemptionCodes.columns.code') },
    { accessorKey: 'amount', header: t('admin.credits.redemptionCodes.columns.amount') },
    { id: 'usage', header: t('admin.credits.redemptionCodes.columns.usage') },
    { accessorKey: 'note', header: t('admin.credits.redemptionCodes.columns.note') },
    { accessorKey: 'expiresAt', header: t('admin.credits.redemptionCodes.columns.expiresAt') },
    { id: 'status', header: t('admin.credits.redemptionCodes.columns.status') },
    { accessorKey: 'createdAt', header: t('admin.credits.redemptionCodes.columns.createdAt') },
    { id: 'actions', header: '' }
  ])

  function statusOf(item: RedemptionCode): AdminRedemptionCodeStatusMeta {
    if (!item.isEnabled) {
      return { label: t('admin.credits.redemptionCodes.statuses.disabled'), color: 'neutral' }
    }
    if (item.usedCount >= item.maxUses) {
      return { label: t('admin.credits.redemptionCodes.statuses.usedUp'), color: 'warning' }
    }
    if (item.expiresAt && new Date(item.expiresAt).getTime() <= Date.now()) {
      return { label: t('admin.credits.redemptionCodes.statuses.expired'), color: 'error' }
    }
    return { label: t('admin.credits.redemptionCodes.statuses.available'), color: 'success' }
  }

  function getRowItems(row: RedemptionCode): DropdownMenuItem[] {
    return [{
      label: row.isEnabled
        ? t('admin.credits.redemptionCodes.actions.disable')
        : t('admin.credits.redemptionCodes.actions.enable'),
      icon: row.isEnabled ? 'i-mdi-toggle-switch-off-outline' : 'i-mdi-toggle-switch-outline',
      onSelect: () => options.toggle(row)
    }, {
      type: 'separator'
    }, {
      label: t('common.actions.delete'),
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
    statusItems,
    batchItems,
    columns,
    statusOf,
    getRowItems,
    onBatchFilter
  }
}

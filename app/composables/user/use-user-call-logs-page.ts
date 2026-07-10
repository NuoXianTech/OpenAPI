import type { TableColumn } from '@nuxt/ui'
import { watchDebounced } from '@vueuse/core'
import { computed, ref, type MaybeRefOrGetter } from 'vue'
import {
  createEnumQueryCodec,
  createNumberQueryCodec,
  createStringQueryCodec,
  useDashboardListState
} from '~/composables/dashboard/use-dashboard-list-state'
import { usePrivatePagedList } from '~/composables/dashboard/use-private-paged-list'

export interface UserCallLogRow {
  id: number
  apiId: number
  apiName: string | null
  apiPath: string
  method: string
  statusCode: number
  latencyMs: number
  ip: string | null
  apiKeyId: number | null
  apiKeyName: string | null
  errorCode: string | null
  errorMessage: string | null
  creditsCost: number
  isCounted: boolean
  createdAt: string
}

interface UserCallLogFilterOptions {
  apis: Array<{ id: number, name: string, apiPath: string }>
  apiKeys: Array<{ id: number, name: string }>
}

interface UserCallLogFilters {
  keyword: string
  apiId: number
  apiKeyId: number
  status: 'all' | 'success' | 'failure'
}

interface UseUserCallLogsPageOptions {
  immediate?: boolean
  replaceQuery?: (query: Record<string, string | number>) => void | Promise<void>
  routeQuery?: MaybeRefOrGetter<Record<string, unknown>>
}

const USER_CALL_LOG_DEFAULT_FILTERS: UserCallLogFilters = {
  keyword: '',
  apiId: 0,
  apiKeyId: 0,
  status: 'all'
}

const USER_CALL_STATUSES = ['all', 'success', 'failure'] as const

function isUserCallSuccess(row: UserCallLogRow) {
  return row.isCounted && row.statusCode >= 200 && row.statusCode < 400 && !row.errorCode
}

export function userCallOutcomeLabel(row: UserCallLogRow) {
  if (!row.isCounted) return '未计数'
  return isUserCallSuccess(row) ? '成功' : '失败'
}

export function userCallOutcomeColor(row: UserCallLogRow): 'success' | 'error' | 'neutral' {
  if (!row.isCounted) return 'neutral'
  return isUserCallSuccess(row) ? 'success' : 'error'
}

export function userCallOutcomeIcon(row: UserCallLogRow) {
  if (!row.isCounted) return 'i-mdi-minus-circle-outline'
  return isUserCallSuccess(row) ? 'i-mdi-check-circle-outline' : 'i-mdi-alert-circle-outline'
}

export function useUserCallLogsPage(options: UseUserCallLogsPageOptions = {}) {
  const filterOptions = ref<UserCallLogFilterOptions>({ apis: [], apiKeys: [] })
  const listState = useDashboardListState<UserCallLogFilters>({
    defaultFilters: USER_CALL_LOG_DEFAULT_FILTERS,
    defaultPageSize: 50,
    routeQuery: options.routeQuery,
    replaceQuery: options.replaceQuery,
    filterCodecs: {
      keyword: createStringQueryCodec(''),
      apiId: createNumberQueryCodec(0),
      apiKeyId: createNumberQueryCodec(0),
      status: createEnumQueryCodec(USER_CALL_STATUSES, 'all')
    }
  })

  const list = usePrivatePagedList<UserCallLogFilters, UserCallLogRow>({
    path: '/api/user/calls/list',
    defaultFilters: USER_CALL_LOG_DEFAULT_FILTERS,
    filters: listState.filters,
    page: listState.page,
    pageSize: listState.pageSize,
    immediate: options.immediate ?? true,
    buildQuery: (filters, pagination) => ({
      keyword: filters.keyword.trim() || undefined,
      apiId: filters.apiId || undefined,
      apiKeyId: filters.apiKeyId || undefined,
      status: filters.status === 'all' ? undefined : filters.status,
      limit: pagination.limit,
      offset: pagination.offset
    })
  })

  const apiSelectItems = computed(() => [
    { label: '全部 API', value: 0 },
    ...filterOptions.value.apis.map(api => ({ label: `${api.name}（${api.apiPath}）`, value: api.id }))
  ])
  const keySelectItems = computed(() => [
    { label: '全部 Key', value: 0 },
    ...filterOptions.value.apiKeys.map(key => ({ label: key.name || `#${key.id}`, value: key.id }))
  ])
  const statusSelectItems = [
    { label: '全部状态', value: 'all' },
    { label: '成功', value: 'success' },
    { label: '失败', value: 'failure' }
  ]
  const lastAppliedKeyword = ref(listState.filters.keyword.trim())
  const activeFilterCount = computed(() => [
    listState.filters.apiId !== 0,
    listState.filters.apiKeyId !== 0,
    listState.filters.status !== 'all'
  ].filter(Boolean).length)
  const columns: TableColumn<UserCallLogRow>[] = [
    { accessorKey: 'createdAt', header: '时间' },
    { accessorKey: 'apiKeyName', header: '密钥' },
    { accessorKey: 'apiName', header: '接口' },
    { accessorKey: 'creditsCost', header: '费用' },
    { id: 'summary', header: '摘要' },
    { id: 'actions', header: '' }
  ]

  async function loadFilterOptions() {
    filterOptions.value = await $fetch<UserCallLogFilterOptions>('/api/user/calls/filters')
      || { apis: [], apiKeys: [] }
  }

  async function applyFilters() {
    lastAppliedKeyword.value = listState.filters.keyword.trim()
    await list.applyFilters()
    await listState.syncQuery()
  }

  async function resetFilters() {
    lastAppliedKeyword.value = USER_CALL_LOG_DEFAULT_FILTERS.keyword
    await list.reset()
    await listState.syncQuery()
  }

  watchDebounced(
    () => listState.filters.keyword.trim(),
    async (keyword) => {
      if (keyword === lastAppliedKeyword.value) return
      lastAppliedKeyword.value = keyword
      await list.applyFilters()
      await listState.syncQuery()
    },
    { debounce: 250, maxWait: 1000 }
  )

  return {
    filters: listState.filters,
    page: listState.page,
    pageSize: listState.pageSize,
    activeQuery: listState.activeQuery,
    items: list.items,
    total: list.total,
    totalPages: list.totalPages,
    status: list.status,
    loading: list.loading,
    error: list.error,
    refresh: list.refresh,
    applyFilters,
    resetFilters,
    filterOptions,
    apiSelectItems,
    keySelectItems,
    statusSelectItems,
    activeFilterCount,
    columns,
    loadFilterOptions
  }
}

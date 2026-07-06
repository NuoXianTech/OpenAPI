import type { TableColumn } from '@nuxt/ui'
import { computed, ref, type MaybeRefOrGetter } from 'vue'
import {
  createNumberQueryCodec,
  type DashboardQueryCodec,
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

export interface UserCallLogFilterOptions {
  apis: Array<{ id: number, name: string, apiPath: string }>
  apiKeys: Array<{ id: number, name: string }>
}

export interface UserCallLogFilters {
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
  apiId: 0,
  apiKeyId: 0,
  status: 'all'
}

function isUserCallStatus(value: string): value is UserCallLogFilters['status'] {
  return value === 'all' || value === 'success' || value === 'failure'
}

function createUserCallStatusQueryCodec(): DashboardQueryCodec<UserCallLogFilters['status']> {
  return {
    parse(value) {
      const raw = Array.isArray(value) ? value[0] : value
      const status = String(raw ?? 'all')
      return isUserCallStatus(status) ? status : 'all'
    },
    serialize(value) {
      return value === 'all' ? undefined : value
    }
  }
}

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
  if (!row.isCounted) return 'i-lucide-circle-minus'
  return isUserCallSuccess(row) ? 'i-lucide-circle-check' : 'i-lucide-circle-alert'
}

export function useUserCallLogsPage(options: UseUserCallLogsPageOptions = {}) {
  const filterOptions = ref<UserCallLogFilterOptions>({ apis: [], apiKeys: [] })
  const listState = useDashboardListState<UserCallLogFilters>({
    defaultFilters: USER_CALL_LOG_DEFAULT_FILTERS,
    defaultPageSize: 50,
    routeQuery: options.routeQuery,
    replaceQuery: options.replaceQuery,
    filterCodecs: {
      apiId: createNumberQueryCodec(0),
      apiKeyId: createNumberQueryCodec(0),
      status: createUserCallStatusQueryCodec()
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
    await list.applyFilters()
    await listState.syncQuery()
  }

  async function resetFilters() {
    await list.reset()
    await listState.syncQuery()
  }

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

import type { TableColumn } from '@nuxt/ui'
import { computed, ref, type MaybeRefOrGetter } from 'vue'
import {
  createEnumQueryCodec,
  createNumberQueryCodec,
  createStringQueryCodec,
  useDashboardListState
} from '~/composables/dashboard/use-dashboard-list-state'
import { usePrivatePagedList } from '~/composables/dashboard/use-private-paged-list'
import { useDebouncedListKeyword } from '~/composables/dashboard/use-debounced-list-keyword'

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

export function userCallOutcomeColor(row: UserCallLogRow): 'success' | 'error' | 'neutral' {
  if (!row.isCounted) return 'neutral'
  return isUserCallSuccess(row) ? 'success' : 'error'
}

export function userCallOutcomeIcon(row: UserCallLogRow) {
  if (!row.isCounted) return 'i-mdi-minus-circle-outline'
  return isUserCallSuccess(row) ? 'i-mdi-check-circle-outline' : 'i-mdi-alert-circle-outline'
}

export function useUserCallOutcomeMeta() {
  const { t } = useI18n()

  function getOutcomeLabel(row: UserCallLogRow): string {
    if (!row.isCounted) return t('user.logs.outcomes.notCounted')
    return isUserCallSuccess(row) ? t('common.states.success') : t('common.states.failure')
  }

  return { getOutcomeLabel }
}

export function useUserCallLogsPage(options: UseUserCallLogsPageOptions = {}) {
  const { t } = useI18n()
  const filterOptions = ref<UserCallLogFilterOptions>({ apis: [], apiKeys: [] })
  const listState = useDashboardListState<UserCallLogFilters>({
    defaultFilters: USER_CALL_LOG_DEFAULT_FILTERS,
    filterCountKeys: ['apiId', 'apiKeyId', 'status'],
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
    { label: t('user.logs.filters.allApis'), value: 0 },
    ...filterOptions.value.apis.map(api => ({ label: `${api.name}（${api.apiPath}）`, value: api.id }))
  ])
  const keySelectItems = computed(() => [
    { label: t('user.logs.filters.allKeys'), value: 0 },
    ...filterOptions.value.apiKeys.map(key => ({ label: key.name || `#${key.id}`, value: key.id }))
  ])
  const statusSelectItems = computed(() => [
    { label: t('user.logs.filters.allStatuses'), value: 'all' },
    { label: t('common.states.success'), value: 'success' },
    { label: t('common.states.failure'), value: 'failure' }
  ])
  async function applyListFilters() {
    await list.applyFilters()
    await listState.syncQuery()
  }

  const keywordApply = useDebouncedListKeyword(
    () => listState.filters.keyword,
    applyListFilters
  )
  const columns = computed<TableColumn<UserCallLogRow>[]>(() => [
    { accessorKey: 'createdAt', header: t('user.logs.columns.time') },
    { accessorKey: 'apiKeyName', header: t('user.logs.columns.key') },
    { accessorKey: 'apiName', header: t('user.logs.columns.api') },
    { accessorKey: 'creditsCost', header: t('user.logs.columns.cost') },
    { id: 'summary', header: t('user.logs.columns.summary') },
    { id: 'actions', header: '' }
  ])

  async function loadFilterOptions() {
    filterOptions.value = await $fetch<UserCallLogFilterOptions>('/api/user/calls/filters')
      || { apis: [], apiKeys: [] }
  }

  async function resetFilters() {
    await list.reset()
    keywordApply.markApplied()
    await listState.syncQuery()
  }

  return {
    filters: listState.filters,
    page: listState.page,
    pageSize: listState.pageSize,
    items: list.items,
    total: list.total,
    loading: list.loading,
    refresh: list.refresh,
    applyFilters: keywordApply.applyNow,
    resetFilters,
    filterOptions,
    apiSelectItems,
    keySelectItems,
    statusSelectItems,
    activeFilterCount: listState.activeFilterCount,
    columns,
    loadFilterOptions
  }
}

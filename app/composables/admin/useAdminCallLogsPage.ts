import type { TableColumn } from '@nuxt/ui'
import { computed, ref, type MaybeRefOrGetter } from 'vue'
import {
  ADMIN_LOG_TYPES,
  type AdminLogRow,
  type AdminLogType,
  type AdminLogsFilterOptions
} from '~~/shared/types/admin-logs'
import {
  createNumberQueryCodec,
  createStringArrayQueryCodec,
  createStringQueryCodec,
  type DashboardQueryCodec,
  useDashboardListState
} from '~/composables/dashboard/useDashboardListState'
import { usePrivatePagedList } from '~/composables/dashboard/usePrivatePagedList'

export interface AdminCallLogsFilters {
  startAt: string
  endAt: string
  apiId: number
  categoryId: number
  types: AdminLogType[]
  apiKeyId: number | ''
  userId: number | ''
  requestId: string
}

export interface UseAdminCallLogsPageOptions {
  immediate?: boolean
  replaceQuery?: (query: Record<string, string | number>) => void | Promise<void>
  routeQuery?: MaybeRefOrGetter<Record<string, unknown>>
}

export const ADMIN_CALL_LOG_DEFAULT_FILTERS: AdminCallLogsFilters = {
  startAt: '',
  endAt: '',
  apiId: 0,
  categoryId: 0,
  types: [],
  apiKeyId: '',
  userId: '',
  requestId: ''
}

export const ADMIN_CALL_LOG_TYPE_META: Record<AdminLogType, {
  label: string
  color: 'success' | 'error' | 'primary'
  icon: string
}> = {
  consume: { label: '请求', color: 'primary', icon: 'i-mdi-swap-horizontal-circle-outline' },
  error: { label: '错误', color: 'error', icon: 'i-mdi-alert-circle-outline' }
}

function isAdminLogType(value: string): value is AdminLogType {
  return ADMIN_LOG_TYPES.includes(value as AdminLogType)
}

function createAdminLogTypesQueryCodec(): DashboardQueryCodec<AdminLogType[]> {
  const stringArrayCodec = createStringArrayQueryCodec([])

  return {
    parse(value) {
      return stringArrayCodec.parse(value).filter(isAdminLogType)
    },
    serialize(value) {
      return value.length ? value.join(',') : undefined
    }
  }
}

function createOptionalNumberQueryCodec(): DashboardQueryCodec<number | ''> {
  return {
    parse(value) {
      const raw = Array.isArray(value) ? value[0] : value
      const parsed = Number(raw)
      return Number.isFinite(parsed) && parsed > 0 ? parsed : ''
    },
    serialize(value) {
      return typeof value === 'number' && value > 0 ? value : undefined
    }
  }
}

export function useAdminCallLogsPage(options: UseAdminCallLogsPageOptions = {}) {
  const filterOptions = ref<AdminLogsFilterOptions>({ apis: [], categories: [] })
  const listState = useDashboardListState<AdminCallLogsFilters>({
    defaultFilters: ADMIN_CALL_LOG_DEFAULT_FILTERS,
    defaultPageSize: 50,
    routeQuery: options.routeQuery,
    replaceQuery: options.replaceQuery,
    filterCodecs: {
      startAt: createStringQueryCodec(''),
      endAt: createStringQueryCodec(''),
      apiId: createNumberQueryCodec(0),
      categoryId: createNumberQueryCodec(0),
      types: createAdminLogTypesQueryCodec(),
      apiKeyId: createOptionalNumberQueryCodec(),
      userId: createOptionalNumberQueryCodec(),
      requestId: createStringQueryCodec('')
    }
  })

  const list = usePrivatePagedList<AdminCallLogsFilters, AdminLogRow>({
    path: '/api/admin/logs/list',
    defaultFilters: ADMIN_CALL_LOG_DEFAULT_FILTERS,
    filters: listState.filters,
    page: listState.page,
    pageSize: listState.pageSize,
    immediate: options.immediate ?? true,
    buildQuery: (filters, pagination) => ({
      startAt: filters.startAt ? new Date(filters.startAt).toISOString() : undefined,
      endAt: filters.endAt ? new Date(filters.endAt).toISOString() : undefined,
      apiId: filters.apiId || undefined,
      categoryId: filters.categoryId || undefined,
      types: filters.types.length ? filters.types.join(',') : undefined,
      apiKeyId: filters.apiKeyId || undefined,
      userId: filters.userId || undefined,
      requestId: filters.requestId.trim() || undefined,
      limit: pagination.limit,
      offset: pagination.offset
    })
  })

  const typeSelectItems = ADMIN_LOG_TYPES.map(type => ({
    label: ADMIN_CALL_LOG_TYPE_META[type].label,
    value: type,
    icon: ADMIN_CALL_LOG_TYPE_META[type].icon
  }))
  const apiSelectItems = computed(() => [
    { label: '全部接口', value: 0 },
    ...filterOptions.value.apis.map(api => ({ label: `${api.name}（${api.apiPath}）`, value: api.id }))
  ])
  const categorySelectItems = computed(() => [
    { label: '全部分类', value: 0 },
    ...filterOptions.value.categories.map(category => ({ label: category.name, value: category.id }))
  ])
  const hasAdvancedFilters = computed(
    () => listState.filters.apiKeyId !== '' || listState.filters.userId !== '' || !!listState.filters.requestId
  )
  const activeFilterCount = computed(() => [
    !!listState.filters.startAt,
    !!listState.filters.endAt,
    listState.filters.apiId !== 0,
    listState.filters.categoryId !== 0,
    listState.filters.types.length > 0,
    listState.filters.apiKeyId !== '',
    listState.filters.userId !== '',
    !!listState.filters.requestId
  ].filter(Boolean).length)
  const columns: TableColumn<AdminLogRow>[] = [
    { accessorKey: 'createdAt', header: '时间' },
    { accessorKey: 'userName', header: '用户' },
    { accessorKey: 'apiKeyName', header: '密钥' },
    { accessorKey: 'apiName', header: '接口' },
    { accessorKey: 'cost', header: '费用' },
    { id: 'summary', header: '摘要' },
    { id: 'actions', header: '' }
  ]

  async function loadFilterOptions() {
    try {
      filterOptions.value = await $fetch<AdminLogsFilterOptions>('/api/admin/logs/filters')
        || { apis: [], categories: [] }
    } catch (err) {
      console.error('failed to load logs filters', err)
    }
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
    typeSelectItems,
    apiSelectItems,
    categorySelectItems,
    hasAdvancedFilters,
    activeFilterCount,
    columns,
    loadFilterOptions
  }
}

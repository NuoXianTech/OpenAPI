import type { TableColumn } from '@nuxt/ui'
import { computed, ref, type ComputedRef, type MaybeRefOrGetter, type Ref } from 'vue'
import {
  ADMIN_LOG_TYPES,
  type AdminLogRow,
  type AdminLogType,
  type AdminLogsFilterOptions
} from '#shared/types/admin'
import type {
  AdminLoginLogRow,
  LoginLogBadgeColor,
  LoginMethod
} from '#shared/types/login-log'
import {
  createNumberQueryCodec,
  createStringArrayQueryCodec,
  createStringQueryCodec,
  type DashboardQueryCodec,
  useDashboardListState
} from '~/composables/dashboard/use-dashboard-list-state'
import { DEFAULT_PAGE_SIZE } from '~/composables/dashboard/use-client-pagination'
import { usePrivatePagedList, type PrivatePagedPagination } from '~/composables/dashboard/use-private-paged-list'
import { useLoginLogMeta } from '~/composables/logs/use-login-log-meta'

interface AdminCallLogsFilters {
  startAt: string
  endAt: string
  apiId: number
  categoryId: number
  types: AdminLogType[]
  apiKeyId: number | ''
  userId: number | ''
  requestId: string
}

interface UseAdminCallLogsPageOptions {
  immediate?: boolean
  replaceQuery?: (query: Record<string, string | number>) => void | Promise<void>
  routeQuery?: MaybeRefOrGetter<Record<string, unknown>>
}

const ADMIN_CALL_LOG_DEFAULT_FILTERS: AdminCallLogsFilters = {
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
  messageKey: string
  color: 'success' | 'error' | 'primary'
  icon: string
}> = {
  consume: {
    messageKey: 'admin.logs.call.types.request',
    color: 'primary',
    icon: 'i-mdi-swap-horizontal-circle-outline'
  },
  error: {
    messageKey: 'admin.logs.call.types.error',
    color: 'error',
    icon: 'i-mdi-alert-circle-outline'
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
  const { t } = useI18n()
  const filterOptions = ref<AdminLogsFilterOptions>({ apis: [], categories: [] })
  const listState = useDashboardListState<AdminCallLogsFilters>({
    defaultFilters: ADMIN_CALL_LOG_DEFAULT_FILTERS,
    defaultPageSize: DEFAULT_PAGE_SIZE,
    routeQuery: options.routeQuery,
    replaceQuery: options.replaceQuery,
    filterCodecs: {
      startAt: createStringQueryCodec(''),
      endAt: createStringQueryCodec(''),
      apiId: createNumberQueryCodec(0),
      categoryId: createNumberQueryCodec(0),
      types: createStringArrayQueryCodec<AdminLogType>([], ADMIN_LOG_TYPES),
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

  const typeSelectItems = computed(() => ADMIN_LOG_TYPES.map(type => ({
    label: t(ADMIN_CALL_LOG_TYPE_META[type].messageKey),
    value: type,
    icon: ADMIN_CALL_LOG_TYPE_META[type].icon
  })))
  const apiSelectItems = computed(() => [
    { label: t('admin.logs.call.filters.allApis'), value: 0 },
    ...filterOptions.value.apis.map(api => ({ label: `${api.name}（${api.apiPath}）`, value: api.id }))
  ])
  const categorySelectItems = computed(() => [
    { label: t('admin.logs.call.filters.allCategories'), value: 0 },
    ...filterOptions.value.categories.map(category => ({ label: category.name, value: category.id }))
  ])
  const hasAdvancedFilters = computed(
    () => listState.filters.apiKeyId !== '' || listState.filters.userId !== '' || !!listState.filters.requestId
  )
  const columns = computed<TableColumn<AdminLogRow>[]>(() => [
    { accessorKey: 'createdAt', header: t('admin.logs.call.columns.time') },
    { accessorKey: 'userName', header: t('admin.logs.call.columns.user') },
    { accessorKey: 'apiKeyName', header: t('admin.logs.call.columns.key') },
    { accessorKey: 'apiName', header: t('admin.logs.call.columns.api') },
    { accessorKey: 'cost', header: t('admin.logs.call.columns.cost') },
    { id: 'summary', header: t('admin.logs.call.columns.summary') },
    { id: 'actions', header: '' }
  ])

  async function loadFilterOptions() {
    try {
      filterOptions.value = await $fetch<AdminLogsFilterOptions>('/api/admin/logs/filters')
        || { apis: [], categories: [] }
    } catch {
      filterOptions.value = { apis: [], categories: [] }
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
    activeFilterCount: listState.activeFilterCount,
    columns,
    loadFilterOptions
  }
}

interface AdminLoginLogFilters {
  startAt: string
  endAt: string
  method: 'all' | LoginMethod
  success: 'all' | 'success' | 'failure'
  userId: number | ''
}

interface AdminLoginLogSelectItem<TValue extends string = string> {
  label: string
  value: TValue
}

interface UseAdminLoginLogListOptions {
  immediate?: boolean
}

interface UseAdminLoginLogListReturn {
  activeFilterCount: ComputedRef<number>
  applyFilters: () => Promise<void>
  columns: ComputedRef<TableColumn<AdminLoginLogRow>[]>
  filters: AdminLoginLogFilters
  items: Ref<AdminLoginLogRow[]>
  loading: ComputedRef<boolean>
  methodColor: (method: string) => LoginLogBadgeColor
  methodIcon: (method: string) => string | undefined
  methodItems: ComputedRef<Array<AdminLoginLogSelectItem<AdminLoginLogFilters['method']>>>
  page: Ref<number>
  pageSize: Ref<number>
  refresh: () => Promise<void>
  reset: () => Promise<void>
  successItems: ComputedRef<Array<AdminLoginLogSelectItem<AdminLoginLogFilters['success']>>>
  total: Ref<number>
}

const ADMIN_LOGIN_LOG_DEFAULT_PAGE_SIZE = DEFAULT_PAGE_SIZE

const ADMIN_LOGIN_LOG_DEFAULT_FILTERS: AdminLoginLogFilters = {
  startAt: '',
  endAt: '',
  method: 'all',
  success: 'all',
  userId: ''
}

function optionalDateIso(value: string): string | undefined {
  return value ? new Date(value).toISOString() : undefined
}

function buildAdminLoginLogQuery(
  filters: AdminLoginLogFilters,
  pagination: PrivatePagedPagination
): Record<string, unknown> {
  return {
    startAt: optionalDateIso(filters.startAt),
    endAt: optionalDateIso(filters.endAt),
    method: filters.method === 'all' ? undefined : filters.method,
    success: filters.success === 'all' ? undefined : filters.success,
    userId: filters.userId || undefined,
    limit: pagination.limit,
    offset: pagination.offset
  }
}

export function useAdminLoginLogList(
  options: UseAdminLoginLogListOptions = {}
): UseAdminLoginLogListReturn {
  const { t } = useI18n()
  const {
    getLoginMethodColor,
    getLoginMethodIcon,
    getLoginMethodLabel
  } = useLoginLogMeta()
  const {
    filters,
    page,
    pageSize,
    items,
    total,
    loading,
    refresh,
    applyFilters,
    reset
  } = usePrivatePagedList<AdminLoginLogFilters, AdminLoginLogRow>({
    path: '/api/admin/login-logs/list',
    defaultFilters: ADMIN_LOGIN_LOG_DEFAULT_FILTERS,
    defaultPageSize: ADMIN_LOGIN_LOG_DEFAULT_PAGE_SIZE,
    immediate: options.immediate ?? true,
    buildQuery: buildAdminLoginLogQuery
  })

  const activeFilterCount = computed(() => [
    !!filters.startAt,
    !!filters.endAt,
    filters.method !== 'all',
    filters.success !== 'all',
    filters.userId !== ''
  ].filter(Boolean).length)
  const methodItems = computed<Array<AdminLoginLogSelectItem<AdminLoginLogFilters['method']>>>(() => [
    { label: t('admin.logs.login.filters.allMethods'), value: 'all' },
    { label: getLoginMethodLabel('password'), value: 'password' },
    { label: getLoginMethodLabel('oauth_github'), value: 'oauth_github' },
    { label: getLoginMethodLabel('oauth_qq'), value: 'oauth_qq' }
  ])
  const successItems = computed<Array<AdminLoginLogSelectItem<AdminLoginLogFilters['success']>>>(() => [
    { label: t('admin.logs.login.filters.allResults'), value: 'all' },
    { label: t('common.states.success'), value: 'success' },
    { label: t('common.states.failure'), value: 'failure' }
  ])
  const columns = computed<TableColumn<AdminLoginLogRow>[]>(() => [
    { accessorKey: 'createdAt', header: t('admin.logs.login.columns.time') },
    { id: 'user', header: t('admin.logs.login.columns.user') },
    { accessorKey: 'method', header: t('admin.logs.login.columns.method') },
    { accessorKey: 'success', header: t('admin.logs.login.columns.result') },
    { accessorKey: 'device', header: t('admin.logs.login.columns.device') },
    { accessorKey: 'ip', header: 'IP' }
  ])

  return {
    activeFilterCount,
    applyFilters,
    columns,
    filters,
    items,
    loading,
    methodColor: getLoginMethodColor,
    methodIcon: getLoginMethodIcon,
    methodItems,
    page,
    pageSize,
    refresh,
    reset,
    successItems,
    total
  }
}

interface AdminOperationLogRow {
  id: number
  userId: number | null
  actorRole: 'user' | 'admin' | null
  actor: string | null
  action: string
  resourceType: string | null
  resourceId: string | null
  ip: string | null
  userAgent: string | null
  detail: Record<string, unknown> | null
  status: 'success' | 'failure'
  createdAt: string
}

interface AdminOperationLogFilters extends Record<string, unknown> {
  startAt: string
  endAt: string
  userId: number | ''
  actorKind: 'all' | 'admin' | 'user'
  actor: string
  action: string
  resourceType: string
  status: 'all' | 'success' | 'failure'
}

interface UseAdminOperationLogListOptions {
  immediate?: boolean
}

interface UseAdminOperationLogListReturn {
  actorKindItems: ComputedRef<Array<{ label: string, value: AdminOperationLogFilters['actorKind'] }>>
  activeFilterCount: ComputedRef<number>
  applyFilters: () => Promise<void>
  columns: ComputedRef<TableColumn<AdminOperationLogRow>[]>
  detailJson: ComputedRef<string>
  detailOpen: Ref<boolean>
  detailRow: Ref<AdminOperationLogRow | null>
  expandedFilters: Ref<boolean>
  filters: AdminOperationLogFilters
  hasAdvancedFilters: ComputedRef<boolean>
  items: Ref<AdminOperationLogRow[]>
  loading: ComputedRef<boolean>
  openDetail: (row: AdminOperationLogRow) => void
  page: Ref<number>
  pageSize: Ref<number>
  refresh: () => Promise<void>
  reset: () => Promise<void>
  resolveActorLabel: (action: string, userId: number | null, actorRole: AdminOperationLogRow['actorRole']) => string
  resolveActionLabel: (action: string) => string
  statusItems: ComputedRef<Array<{ label: string, value: AdminOperationLogFilters['status'] }>>
  total: Ref<number>
}

const ADMIN_OPERATION_LOG_DEFAULT_PAGE_SIZE = DEFAULT_PAGE_SIZE

const ADMIN_OPERATION_LOG_DEFAULT_FILTERS: AdminOperationLogFilters = {
  startAt: '',
  endAt: '',
  userId: '',
  actorKind: 'all',
  actor: '',
  action: '',
  resourceType: '',
  status: 'all'
}

function trimmedOrUndefined(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed || undefined
}

function buildAdminOperationLogQuery(
  filters: AdminOperationLogFilters,
  pagination: PrivatePagedPagination
): Record<string, unknown> {
  return {
    startAt: optionalDateIso(filters.startAt),
    endAt: optionalDateIso(filters.endAt),
    userId: filters.userId || undefined,
    actorKind: filters.actorKind === 'all' ? undefined : filters.actorKind,
    actor: trimmedOrUndefined(filters.actor),
    action: trimmedOrUndefined(filters.action),
    resourceType: trimmedOrUndefined(filters.resourceType),
    status: filters.status === 'all' ? undefined : filters.status,
    limit: pagination.limit,
    offset: pagination.offset
  }
}

function stringifyOperationLogDetail(detail: Record<string, unknown> | null | undefined): string {
  if (!detail) return ''
  try {
    return JSON.stringify(detail, null, 2)
  } catch {
    return String(detail)
  }
}

function getOperationLogActionMessageKey(action: string): string {
  return `admin.logs.operations.actionLabels.${action.replaceAll(/[.-]/g, '_')}`
}

export function useAdminOperationLogList(
  options: UseAdminOperationLogListOptions = {}
): UseAdminOperationLogListReturn {
  const { t, te } = useI18n()
  const {
    filters,
    page,
    pageSize,
    items,
    total,
    loading,
    refresh,
    applyFilters,
    reset
  } = usePrivatePagedList<AdminOperationLogFilters, AdminOperationLogRow>({
    path: '/api/admin/operation-logs/list',
    defaultFilters: ADMIN_OPERATION_LOG_DEFAULT_FILTERS,
    defaultPageSize: ADMIN_OPERATION_LOG_DEFAULT_PAGE_SIZE,
    immediate: options.immediate ?? true,
    buildQuery: buildAdminOperationLogQuery
  })

  const expandedFilters = ref(false)
  const hasAdvancedFilters = computed(
    () => filters.actorKind !== 'all'
      || !!filters.actor
      || filters.status !== 'all'
      || filters.userId !== ''
      || !!filters.action
      || !!filters.resourceType
  )
  const activeFilterCount = computed(() => [
    !!filters.startAt,
    !!filters.endAt,
    filters.userId !== '',
    filters.actorKind !== 'all',
    !!filters.actor,
    !!filters.action,
    !!filters.resourceType,
    filters.status !== 'all'
  ].filter(Boolean).length)

  const detailRow = ref<AdminOperationLogRow | null>(null)
  const detailOpen = ref(false)
  const detailJson = computed(() => stringifyOperationLogDetail(detailRow.value?.detail))
  const actorKindItems = computed<UseAdminOperationLogListReturn['actorKindItems']['value']>(() => [
    { label: t('admin.logs.operations.filters.allSources'), value: 'all' },
    { label: t('admin.logs.operations.filters.adminActions'), value: 'admin' },
    { label: t('admin.logs.operations.filters.userActions'), value: 'user' }
  ])
  const statusItems = computed<UseAdminOperationLogListReturn['statusItems']['value']>(() => [
    { label: t('admin.logs.operations.filters.allStatuses'), value: 'all' },
    { label: t('common.states.success'), value: 'success' },
    { label: t('common.states.failure'), value: 'failure' }
  ])
  const columns = computed<TableColumn<AdminOperationLogRow>[]>(() => [
    { accessorKey: 'createdAt', header: t('admin.logs.operations.columns.time') },
    { id: 'actor', header: t('admin.logs.operations.columns.actor') },
    { accessorKey: 'action', header: t('admin.logs.operations.columns.action') },
    { id: 'resource', header: t('admin.logs.operations.columns.resource') },
    { accessorKey: 'status', header: t('admin.logs.operations.columns.status') },
    { accessorKey: 'ip', header: 'IP' },
    { id: 'actions', header: '' }
  ])

  function resolveActorLabel(
    action: string,
    userId: number | null,
    actorRole: AdminOperationLogRow['actorRole'] = null
  ): string {
    const isAdmin = actorRole === 'admin' || (!actorRole && action.startsWith('admin.'))
    const isUser = actorRole === 'user' || (!actorRole && action.startsWith('user.'))

    if (isAdmin) {
      return userId
        ? t('common.identities.adminWithId', { id: userId })
        : t('common.identities.admin')
    }
    if (isUser || userId) {
      return userId
        ? t('common.identities.userWithId', { id: userId })
        : t('common.identities.user')
    }
    return t('common.identities.system')
  }

  function resolveActionLabel(action: string): string {
    const messageKey = getOperationLogActionMessageKey(action)
    return te(messageKey) ? t(messageKey) : action
  }

  function openDetail(row: AdminOperationLogRow) {
    detailRow.value = row
    detailOpen.value = true
  }

  return {
    actorKindItems,
    activeFilterCount,
    applyFilters,
    columns,
    detailJson,
    detailOpen,
    detailRow,
    expandedFilters,
    filters,
    hasAdvancedFilters,
    items,
    loading,
    openDetail,
    page,
    pageSize,
    refresh,
    reset,
    resolveActorLabel,
    resolveActionLabel,
    statusItems,
    total
  }
}

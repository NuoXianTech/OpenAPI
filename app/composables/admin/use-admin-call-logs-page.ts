import type { TableColumn } from '@nuxt/ui'
import { computed, ref, type ComputedRef, type MaybeRefOrGetter, type Ref } from 'vue'
import {
  ADMIN_LOG_TYPES,
  type AdminLogRow,
  type AdminLogType,
  type AdminLogsFilterOptions
} from '~~/shared/types/admin-logs'
import {
  LOGIN_METHOD_META,
  type AdminLoginLogRow,
  type LoginMethod
} from '~~/shared/types/login-log'
import {
  createNumberQueryCodec,
  createStringArrayQueryCodec,
  createStringQueryCodec,
  type DashboardQueryCodec,
  useDashboardListState
} from '~/composables/dashboard/use-dashboard-list-state'
import { usePrivatePagedList, type PrivatePagedPagination } from '~/composables/dashboard/use-private-paged-list'

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
    activeFilterCount,
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
  columns: TableColumn<AdminLoginLogRow>[]
  filters: AdminLoginLogFilters
  items: Ref<AdminLoginLogRow[]>
  loading: ComputedRef<boolean>
  methodColor: (method: string) => AdminLoginLogBadgeColor
  methodIcon: (method: string) => string | undefined
  methodItems: Array<AdminLoginLogSelectItem<AdminLoginLogFilters['method']>>
  page: Ref<number>
  pageSize: Ref<number>
  reset: () => Promise<void>
  successItems: Array<AdminLoginLogSelectItem<AdminLoginLogFilters['success']>>
  total: Ref<number>
}

type AdminLoginLogBadgeColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'

const ADMIN_LOGIN_LOG_DEFAULT_PAGE_SIZE = 50

const ADMIN_LOGIN_LOG_DEFAULT_FILTERS: AdminLoginLogFilters = {
  startAt: '',
  endAt: '',
  method: 'all',
  success: 'all',
  userId: ''
}

const ADMIN_LOGIN_LOG_METHOD_ITEMS: Array<AdminLoginLogSelectItem<AdminLoginLogFilters['method']>> = [
  { label: '全部方式', value: 'all' },
  { label: LOGIN_METHOD_META.password.label, value: 'password' },
  { label: LOGIN_METHOD_META.oauth_github.label, value: 'oauth_github' },
  { label: LOGIN_METHOD_META.oauth_qq.label, value: 'oauth_qq' }
]

const ADMIN_LOGIN_LOG_SUCCESS_ITEMS: Array<AdminLoginLogSelectItem<AdminLoginLogFilters['success']>> = [
  { label: '全部结果', value: 'all' },
  { label: '成功', value: 'success' },
  { label: '失败', value: 'failure' }
]

const ADMIN_LOGIN_LOG_COLUMNS: TableColumn<AdminLoginLogRow>[] = [
  { accessorKey: 'createdAt', header: '时间' },
  { id: 'user', header: '用户' },
  { accessorKey: 'method', header: '方式' },
  { accessorKey: 'success', header: '结果' },
  { accessorKey: 'device', header: '设备' },
  { accessorKey: 'ip', header: 'IP' }
]

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

function resolveAdminLoginLogMethodColor(method: string): AdminLoginLogBadgeColor {
  return LOGIN_METHOD_META[method as LoginMethod]?.color || 'neutral'
}

function resolveAdminLoginLogMethodIcon(method: string): string | undefined {
  return LOGIN_METHOD_META[method as LoginMethod]?.icon
}

export function useAdminLoginLogList(
  options: UseAdminLoginLogListOptions = {}
): UseAdminLoginLogListReturn {
  const {
    filters,
    page,
    pageSize,
    items,
    total,
    loading,
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

  return {
    activeFilterCount,
    applyFilters,
    columns: ADMIN_LOGIN_LOG_COLUMNS,
    filters,
    items,
    loading,
    methodColor: resolveAdminLoginLogMethodColor,
    methodIcon: resolveAdminLoginLogMethodIcon,
    methodItems: ADMIN_LOGIN_LOG_METHOD_ITEMS,
    page,
    pageSize,
    reset,
    successItems: ADMIN_LOGIN_LOG_SUCCESS_ITEMS,
    total
  }
}

interface AdminOperationLogRow {
  id: number
  userId: number | null
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
  actorKindItems: Array<{ label: string, value: AdminOperationLogFilters['actorKind'] }>
  activeFilterCount: ComputedRef<number>
  applyFilters: () => Promise<void>
  columns: TableColumn<AdminOperationLogRow>[]
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
  reset: () => Promise<void>
  resolveActionLabel: (action: string) => string
  statusItems: Array<{ label: string, value: AdminOperationLogFilters['status'] }>
  total: Ref<number>
}

const ADMIN_OPERATION_LOG_DEFAULT_PAGE_SIZE = 50

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

const ADMIN_OPERATION_LOG_ACTOR_KIND_ITEMS: UseAdminOperationLogListReturn['actorKindItems'] = [
  { label: '全部来源', value: 'all' },
  { label: '管理员操作', value: 'admin' },
  { label: '用户操作', value: 'user' }
]

const ADMIN_OPERATION_LOG_STATUS_ITEMS: UseAdminOperationLogListReturn['statusItems'] = [
  { label: '全部状态', value: 'all' },
  { label: '成功', value: 'success' },
  { label: '失败', value: 'failure' }
]

const ADMIN_OPERATION_LOG_COLUMNS: TableColumn<AdminOperationLogRow>[] = [
  { accessorKey: 'createdAt', header: '时间' },
  { id: 'actor', header: '操作者' },
  { accessorKey: 'action', header: '动作' },
  { id: 'resource', header: '资源' },
  { accessorKey: 'status', header: '状态' },
  { accessorKey: 'ip', header: 'IP' },
  { id: 'actions', header: '' }
]

const OPERATION_LOG_ACTION_LABELS: Record<string, string> = {
  'admin.api-category.create': '创建接口分类',
  'admin.api-category.update': '更新接口分类',
  'admin.api-category.delete': '删除接口分类',
  'admin.api.register': '注册接口',
  'admin.api.update': '更新接口',
  'admin.api.delete': '删除接口',
  'admin.api.toggle.isEnabled': '切换接口启用状态',
  'admin.api.toggle.isStatistics': '切换接口统计状态',
  'admin.friend-link.create': '创建友情链接',
  'admin.friend-link.update': '更新友情链接',
  'admin.friend-link.delete': '删除友情链接',
  'admin.announcement.create': '创建公告',
  'admin.announcement.update': '更新公告',
  'admin.announcement.delete': '删除公告',
  'admin.notification.send': '发送通知',
  'admin.notification.delete': '删除通知',
  'admin.api-key.create': '创建 API 密钥',
  'admin.api-key.update': '更新 API 密钥',
  'admin.api-key.reset': '重置 API 密钥',
  'admin.user.create': '创建用户',
  'admin.user.update': '更新用户',
  'admin.user.delete': '删除用户',
  'admin.user.ban': '封禁用户',
  'admin.user.unban': '解封用户',
  'admin.credit.grant': '发放积分',
  'admin.credit.revoke': '扣除积分',
  'admin.credit.reset': '重置积分',
  'admin.redemption-code.generate': '生成兑换码',
  'admin.redemption-code.delete': '删除兑换码',
  'admin.redemption-code.batch-delete': '批量删除兑换码',
  'admin.redemption-code.enable': '启用兑换码',
  'admin.redemption-code.disable': '停用兑换码',
  'admin.redemption-code.batch-enable': '批量启用兑换码',
  'admin.redemption-code.batch-disable': '批量停用兑换码',
  'admin.oauth-provider.update': '更新 OAuth 配置',
  'admin.settings.update': '更新系统设置',
  'admin.settings.smtp.test': '测试邮件发送',
  'user.checkin': '每日签到',
  'user.password.change': '修改密码',
  'user.oauth.unbind': '解绑第三方账号',
  'user.redemption-code.redeem': '兑换码兑换'
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

function resolveOperationLogActionLabel(action: string): string {
  return OPERATION_LOG_ACTION_LABELS[action] ?? action
}

export function useAdminOperationLogList(
  options: UseAdminOperationLogListOptions = {}
): UseAdminOperationLogListReturn {
  const {
    filters,
    page,
    pageSize,
    items,
    total,
    loading,
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

  function openDetail(row: AdminOperationLogRow) {
    detailRow.value = row
    detailOpen.value = true
  }

  return {
    actorKindItems: ADMIN_OPERATION_LOG_ACTOR_KIND_ITEMS,
    activeFilterCount,
    applyFilters,
    columns: ADMIN_OPERATION_LOG_COLUMNS,
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
    reset,
    resolveActionLabel: resolveOperationLogActionLabel,
    statusItems: ADMIN_OPERATION_LOG_STATUS_ITEMS,
    total
  }
}

import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import { computed, ref, watchEffect, type ComputedRef, type Ref } from 'vue'
import type {
  AdminAnalyticsCallBucket,
  AdminAnalyticsData,
  AdminAnalyticsDistributionItem,
  AdminAnalyticsHourlyPoint,
  AdminAnalyticsOverview,
  AdminAnalyticsRankItem
} from '~~/shared/types/admin-analytics'

interface AdminAnalyticsDistributionChartItem {
  label: string
  value: AdminAnalyticsDistributionChart
  icon: string
}

interface AdminAnalyticsOverviewCard {
  key: string
  label: string
  value: string
  helper: string
  icon: string
  accent: 'primary' | 'warning' | 'info'
}

interface UseAdminAnalyticsDisplayMetaOptions {
  analytics: Readonly<Ref<AdminAnalyticsData>>
}

interface UseAdminAnalyticsDisplayMetaReturn {
  analytics: Readonly<Ref<AdminAnalyticsData>>
  callBuckets: ComputedRef<AdminAnalyticsCallBucket[]>
  distribution: ComputedRef<AdminAnalyticsDistributionItem[]>
  distributionChart: Ref<AdminAnalyticsDistributionChart>
  distributionChartItems: AdminAnalyticsDistributionChartItem[]
  formatCompact: (value: number) => string
  generatedAtLabel: ComputedRef<string>
  hourlyTrend24h: ComputedRef<AdminAnalyticsHourlyPoint[]>
  overview: ComputedRef<AdminAnalyticsOverview>
  overviewCards: ComputedRef<AdminAnalyticsOverviewCard[]>
  ranking: ComputedRef<AdminAnalyticsRankItem[]>
}

type AdminAnalyticsDistributionChart = 'bar' | 'area'

const ADMIN_ANALYTICS_DISTRIBUTION_CHART_ITEMS: AdminAnalyticsDistributionChartItem[] = [
  { label: '柱状图', value: 'bar', icon: 'i-lucide-chart-bar' },
  { label: '面积图', value: 'area', icon: 'i-lucide-chart-area' }
]

export function createEmptyAdminAnalyticsData(): AdminAnalyticsData {
  return {
    overview: {
      enabledApiCount: 0,
      totalEnabledApiCount: 0,
      totalCreditsSpent: 0,
      averageDailyCalls: 0,
      averageWindowDays: 7
    },
    distribution: [],
    hourlyTrend24h: [],
    callBuckets: [],
    ranking: [],
    generatedAt: new Date(0).toISOString()
  }
}

function formatAdminAnalyticsCount(value: number): string {
  return value.toLocaleString()
}

function formatAdminAnalyticsCompact(value: number): string {
  return new Intl.NumberFormat('zh-CN', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value)
}

function formatAdminAnalyticsGeneratedAt(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) || date.getTime() === 0
    ? '-'
    : date.toLocaleString('zh-CN', { hour12: false })
}

export function useAdminAnalyticsDisplayMeta(
  options: UseAdminAnalyticsDisplayMetaOptions
): UseAdminAnalyticsDisplayMetaReturn {
  const distributionChart = ref<AdminAnalyticsDistributionChart>('bar')
  const overview = computed(() => options.analytics.value.overview)
  const distribution = computed(() => options.analytics.value.distribution)
  const hourlyTrend24h = computed(() => options.analytics.value.hourlyTrend24h)
  const callBuckets = computed(() => options.analytics.value.callBuckets)
  const ranking = computed(() => options.analytics.value.ranking)
  const generatedAtLabel = computed(() => formatAdminAnalyticsGeneratedAt(options.analytics.value.generatedAt))

  const overviewCards = computed<AdminAnalyticsOverviewCard[]>(() => [
    {
      key: 'apis',
      label: '接口总数',
      value: formatAdminAnalyticsCount(overview.value.enabledApiCount),
      helper: `已启用 ${overview.value.totalEnabledApiCount}，其中纳入统计 ${overview.value.enabledApiCount}`,
      icon: 'i-lucide-braces',
      accent: 'primary'
    },
    {
      key: 'credits',
      label: '总使用积分',
      value: formatAdminAnalyticsCount(overview.value.totalCreditsSpent),
      helper: '累计 API 调用扣费',
      icon: 'i-lucide-coins',
      accent: 'warning'
    },
    {
      key: 'average',
      label: '平均请求数',
      value: formatAdminAnalyticsCount(Math.round(overview.value.averageDailyCalls)),
      helper: `近 ${overview.value.averageWindowDays} 天日均`,
      icon: 'i-lucide-chart-line',
      accent: 'info'
    }
  ])

  return {
    analytics: options.analytics,
    callBuckets,
    distribution,
    distributionChart,
    distributionChartItems: ADMIN_ANALYTICS_DISTRIBUTION_CHART_ITEMS,
    formatCompact: formatAdminAnalyticsCompact,
    generatedAtLabel,
    hourlyTrend24h,
    overview,
    overviewCards,
    ranking
  }
}

interface AdminDiscoveredEndpoint {
  apiPath: string
  method: string
  sourceFile: string
  isDynamic: boolean
}

interface AdminRegisteredApi {
  id: number
  code: string
  pathVersion: string
  name: string
  shortDesc: string
  description: string
  apiPath: string
  httpMethod: string
  endpointCount: number
  docUrl: string
  status: number
  categoryId: number | null
  isEnabled: boolean
  isApiKey: boolean
  isStatistics: boolean
  rateLimitPerSecond: number
  rateLimitPerMinute: number
  rateLimitPerHour: number
  rateLimitPerDay: number
  dailyQuota: number
  methodCosts: Record<string, number>
  timeoutMs: number
}

export interface AdminDiscoveredApi {
  pathVersion: string
  code: string
  endpointCount: number
  endpoints: AdminDiscoveredEndpoint[]
  registered: AdminRegisteredApi | null
  orphaned: boolean
}

export interface AdminVersionGroup {
  pathVersion: string
  apis: AdminDiscoveredApi[]
  stats: {
    total: number
    registered: number
    unregistered: number
    orphaned: number
  }
}

export interface AdminApiCategoryItem {
  id: number
  name: string
}

interface AdminApiVersionSelectItem {
  label: string
  value: string
}

interface UseAdminApisDisplayMetaOptions {
  versions: Readonly<Ref<AdminVersionGroup[]>>
  categories: Readonly<Ref<AdminApiCategoryItem[]>>
  openRegister: (row: AdminDiscoveredApi) => void | Promise<void>
  openEdit: (row: AdminDiscoveredApi) => void | Promise<void>
  resyncManifest: (row: AdminDiscoveredApi) => void | Promise<void>
}

interface UseAdminApisDisplayMetaReturn {
  activeVersion: Ref<string>
  keyword: Ref<string>
  filteredApis: ComputedRef<AdminDiscoveredApi[]>
  versionItems: ComputedRef<AdminApiVersionSelectItem[]>
  columns: TableColumn<AdminDiscoveredApi>[]
  categoryLabel: (row: AdminDiscoveredApi) => string
  getRowItems: (row: AdminDiscoveredApi) => DropdownMenuItem[]
}

const ADMIN_APIS_TABLE_COLUMNS: TableColumn<AdminDiscoveredApi>[] = [
  { accessorKey: 'code', header: '编码 / 名称' },
  { id: 'endpoints', header: '端点' },
  { id: 'category', header: '分类' },
  { id: 'isEnabled', header: '启用' },
  { id: 'isStatistics', header: '统计' },
  { id: 'isApiKey', header: 'ApiKey' },
  { id: 'actions', header: '' }
]

function filterAdminDiscoveredApis(
  versions: AdminVersionGroup[],
  activeVersion: string,
  keyword: string
): AdminDiscoveredApi[] {
  const group = versions.find(version => version.pathVersion === activeVersion)
  if (!group) return []
  const normalizedKeyword = keyword.trim().toLowerCase()
  if (!normalizedKeyword) return group.apis

  return group.apis.filter(api => (
    api.code.toLowerCase().includes(normalizedKeyword)
    || (api.registered?.name || '').toLowerCase().includes(normalizedKeyword)
    || (api.registered?.shortDesc || '').toLowerCase().includes(normalizedKeyword)
  ))
}

function buildAdminApiVersionItems(
  versions: AdminVersionGroup[]
): AdminApiVersionSelectItem[] {
  return versions.map(version => ({
    label: `${version.pathVersion} (${version.stats.registered}/${version.stats.total})`,
    value: version.pathVersion
  }))
}

export function useAdminApisDisplayMeta(
  options: UseAdminApisDisplayMetaOptions
): UseAdminApisDisplayMetaReturn {
  const activeVersion = ref('')
  const keyword = ref('')

  watchEffect(() => {
    if (options.versions.value.length === 0) return
    const exists = options.versions.value.some(version => version.pathVersion === activeVersion.value)
    if (!exists) {
      activeVersion.value = options.versions.value[0]!.pathVersion
    }
  })

  const categoriesMap = computed(() => {
    const map = new Map<number, string>()
    for (const category of options.categories.value) {
      map.set(category.id, category.name)
    }
    return map
  })

  const filteredApis = computed(() => filterAdminDiscoveredApis(
    options.versions.value,
    activeVersion.value,
    keyword.value
  ))
  const versionItems = computed(() => buildAdminApiVersionItems(options.versions.value))

  function categoryLabel(row: AdminDiscoveredApi): string {
    const id = row.registered?.categoryId
    if (!id) return '-'
    return categoriesMap.value.get(id) || `#${id}`
  }

  function getRowItems(row: AdminDiscoveredApi): DropdownMenuItem[] {
    const items: DropdownMenuItem[] = []
    if (row.registered && !row.orphaned) {
      items.push({
        label: '编辑配置',
        icon: 'i-lucide-pencil',
        onSelect: () => options.openEdit(row)
      }, {
        label: '同步路由信息',
        icon: 'i-lucide-refresh-cw',
        onSelect: () => options.resyncManifest(row)
      })
    }
    if (!row.registered) {
      items.push({
        label: '登记接口',
        icon: 'i-lucide-circle-plus',
        onSelect: () => options.openRegister(row)
      })
    }
    return items
  }

  return {
    activeVersion,
    keyword,
    filteredApis,
    versionItems,
    columns: ADMIN_APIS_TABLE_COLUMNS,
    categoryLabel,
    getRowItems
  }
}

export interface AdminNotificationUserItem {
  id: number
  username: string
  email: string
  displayName: string | null
  isActive: boolean
  isBanned: boolean
}

export interface AdminNotificationMessageRow {
  id: number
  title: string
  level: AdminNotificationLevel
  audience: AdminNotificationAudience
  recipientCount: number
  senderActor: string | null
  createdAt: string
  deliveredCount: number
  readCount: number
}

export interface AdminNotificationDeliveryRow {
  id: number
  recipientUserId: number
  recipientUsername: string | null
  isRead: boolean
  readAt: string | null
  createdAt: string
}

interface AdminNotificationForm {
  audience: AdminNotificationAudience
  recipientUserIds: number[]
  title: string
  content: string
  level: AdminNotificationLevel
  linkUrl: string
}

interface AdminNotificationSelectItem<TValue extends string | number = string> {
  label: string
  value: TValue
}

interface AdminNotificationAudienceMeta {
  color: 'neutral' | 'info' | 'warning'
  label: string
}

interface UseAdminNotificationsDisplayMetaOptions {
  users: Readonly<Ref<AdminNotificationUserItem[]>>
  openDetail: (row: AdminNotificationMessageRow) => void | Promise<void>
  openDelete: (row: AdminNotificationMessageRow) => void | Promise<void>
}

interface UseAdminNotificationsDisplayMetaReturn {
  users: ComputedRef<AdminNotificationUserItem[]>
  userOptions: ComputedRef<Array<AdminNotificationSelectItem<number>>>
  audienceOptions: Array<AdminNotificationSelectItem<AdminNotificationAudience>>
  levelOptions: Array<AdminNotificationSelectItem<AdminNotificationLevel>>
  audienceMeta: Record<AdminNotificationAudience, AdminNotificationAudienceMeta>
  columns: TableColumn<AdminNotificationMessageRow>[]
  getRowItems: (row: AdminNotificationMessageRow) => DropdownMenuItem[]
}

type AdminNotificationAudience = 'specific' | 'all_current' | 'all_with_future'

type AdminNotificationLevel = 'info' | 'success' | 'warning' | 'critical'

const ADMIN_NOTIFICATION_AUDIENCE_OPTIONS: Array<AdminNotificationSelectItem<AdminNotificationAudience>> = [
  { label: '指定用户（仅选中收件人）', value: 'specific' },
  { label: '当前所有用户（不含未来注册）', value: 'all_current' },
  { label: '当前及未来注册用户（新用户激活时自动补发）', value: 'all_with_future' }
]

const ADMIN_NOTIFICATION_LEVEL_OPTIONS: Array<AdminNotificationSelectItem<AdminNotificationLevel>> = [
  { label: '通知 (info)', value: 'info' },
  { label: '成功 (success)', value: 'success' },
  { label: '提醒 (warning)', value: 'warning' },
  { label: '紧急 (critical)', value: 'critical' }
]

const ADMIN_NOTIFICATION_AUDIENCE_META: Record<AdminNotificationAudience, AdminNotificationAudienceMeta> = {
  specific: { color: 'neutral', label: '指定' },
  all_current: { color: 'info', label: '全员' },
  all_with_future: { color: 'warning', label: '全员+未来' }
}

const ADMIN_NOTIFICATION_TABLE_COLUMNS: TableColumn<AdminNotificationMessageRow>[] = [
  { accessorKey: 'title', header: '标题' },
  { id: 'delivery', header: '投递 / 已读' },
  { accessorKey: 'senderActor', header: '发送人' },
  { accessorKey: 'createdAt', header: '发送时间' },
  { id: 'actions', header: '' }
]

export function createAdminNotificationForm(): AdminNotificationForm {
  return {
    audience: 'specific',
    recipientUserIds: [],
    title: '',
    content: '',
    level: 'info',
    linkUrl: ''
  }
}

export function useAdminNotificationsDisplayMeta(
  options: UseAdminNotificationsDisplayMetaOptions
): UseAdminNotificationsDisplayMetaReturn {
  const users = computed(() => options.users.value.filter(user => !user.isBanned))
  const userOptions = computed(() => users.value.map(user => ({
    label: `${user.username}${user.email ? ` <${user.email}>` : ''}`,
    value: user.id
  })))

  function getRowItems(row: AdminNotificationMessageRow): DropdownMenuItem[] {
    return [
      { label: '查看接收详情', icon: 'i-lucide-users', onSelect: () => options.openDetail(row) },
      { label: '删除', icon: 'i-lucide-trash-2', color: 'error', onSelect: () => options.openDelete(row) }
    ]
  }

  return {
    users,
    userOptions,
    audienceOptions: ADMIN_NOTIFICATION_AUDIENCE_OPTIONS,
    levelOptions: ADMIN_NOTIFICATION_LEVEL_OPTIONS,
    audienceMeta: ADMIN_NOTIFICATION_AUDIENCE_META,
    columns: ADMIN_NOTIFICATION_TABLE_COLUMNS,
    getRowItems
  }
}

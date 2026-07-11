import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import { computed, ref, watchEffect, type ComputedRef, type Ref } from 'vue'
import type { DiscoveredApi as AdminDiscoveredApi } from '#shared/types/api'
import type { MessageLevel } from '#shared/types/content'

export type { DiscoveredApi as AdminDiscoveredApi } from '#shared/types/api'

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
        icon: 'i-mdi-pencil-outline',
        onSelect: () => options.openEdit(row)
      }, {
        label: '同步路由信息',
        icon: 'i-mdi-sync',
        onSelect: () => options.resyncManifest(row)
      })
    }
    if (!row.registered) {
      items.push({
        label: '登记接口',
        icon: 'i-mdi-plus-circle-outline',
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
  level: MessageLevel
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
  level: MessageLevel
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
  levelOptions: Array<AdminNotificationSelectItem<MessageLevel>>
  audienceMeta: Record<AdminNotificationAudience, AdminNotificationAudienceMeta>
  columns: TableColumn<AdminNotificationMessageRow>[]
  getRowItems: (row: AdminNotificationMessageRow) => DropdownMenuItem[]
}

type AdminNotificationAudience = 'specific' | 'all_current' | 'all_with_future'

const ADMIN_NOTIFICATION_AUDIENCE_OPTIONS: Array<AdminNotificationSelectItem<AdminNotificationAudience>> = [
  { label: '指定用户（仅选中收件人）', value: 'specific' },
  { label: '当前所有用户（不含未来注册）', value: 'all_current' },
  { label: '当前及未来注册用户（新用户激活时自动补发）', value: 'all_with_future' }
]

const ADMIN_NOTIFICATION_LEVEL_OPTIONS: Array<AdminNotificationSelectItem<MessageLevel>> = [
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
      { label: '查看接收详情', icon: 'i-mdi-account-multiple-outline', onSelect: () => options.openDetail(row) },
      { label: '删除', icon: 'i-mdi-delete-outline', color: 'error', onSelect: () => options.openDelete(row) }
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

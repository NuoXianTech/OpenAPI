import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import { computed, ref, watchEffect, type ComputedRef, type Ref } from 'vue'
import type { DiscoveredApi as AdminDiscoveredApi } from '#shared/types/api'
import { MESSAGE_LEVELS, type MessageLevel } from '#shared/types/content'

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
  openCapabilities: (row: AdminDiscoveredApi) => void | Promise<void>
  resyncManifest: (row: AdminDiscoveredApi) => void | Promise<void>
}

interface UseAdminApisDisplayMetaReturn {
  activeVersion: Ref<string>
  keyword: Ref<string>
  filteredApis: ComputedRef<AdminDiscoveredApi[]>
  versionItems: ComputedRef<AdminApiVersionSelectItem[]>
  columns: ComputedRef<TableColumn<AdminDiscoveredApi>[]>
  categoryLabel: (row: AdminDiscoveredApi) => string
  getRowItems: (row: AdminDiscoveredApi) => DropdownMenuItem[]
}

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

export function useAdminApisDisplayMeta(
  options: UseAdminApisDisplayMetaOptions
): UseAdminApisDisplayMetaReturn {
  const { t, locale } = useI18n()
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
  const versionItems = computed<AdminApiVersionSelectItem[]>(() => options.versions.value.map(version => ({
    label: t('admin.apis.registry.versionOption', {
      version: version.pathVersion,
      registered: version.stats.registered.toLocaleString(locale.value),
      total: version.stats.total.toLocaleString(locale.value)
    }),
    value: version.pathVersion
  })))
  const columns = computed<TableColumn<AdminDiscoveredApi>[]>(() => [
    { accessorKey: 'code', header: t('admin.apis.registry.columns.code') },
    { id: 'endpoints', header: t('admin.apis.registry.columns.endpoints') },
    { id: 'category', header: t('admin.apis.registry.columns.category') },
    { id: 'isEnabled', header: t('admin.apis.registry.columns.enabled') },
    { id: 'isStatistics', header: t('admin.apis.registry.columns.statistics') },
    { id: 'isApiKey', header: t('admin.apis.registry.columns.apiKey') },
    { id: 'actions', header: '' }
  ])

  function categoryLabel(row: AdminDiscoveredApi): string {
    const id = row.registered?.categoryId
    if (!id) return '-'
    return categoriesMap.value.get(id) || `#${id}`
  }

  function getRowItems(row: AdminDiscoveredApi): DropdownMenuItem[] {
    const items: DropdownMenuItem[] = []
    if (row.registered && !row.orphaned) {
      items.push({
        label: t('admin.apis.registry.actions.edit'),
        icon: 'i-mdi-pencil-outline',
        onSelect: () => options.openEdit(row)
      })
    }
    if (row.registered && row.hasCapabilities && !row.orphaned) {
      items.push({
        label: t('admin.apis.registry.actions.capabilities'),
        icon: 'i-mdi-tune-variant',
        onSelect: () => options.openCapabilities(row)
      })
    }
    if (row.registered && !row.orphaned) {
      items.push({
        label: t('admin.apis.registry.actions.sync'),
        icon: 'i-mdi-sync',
        onSelect: () => options.resyncManifest(row)
      })
    }
    if (!row.registered) {
      items.push({
        label: t('admin.apis.registry.actions.register'),
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
    columns,
    categoryLabel,
    getRowItems
  }
}

export interface AdminNotificationMessageRow {
  id: number
  title: string
  level: MessageLevel
  audience: AdminNotificationAudience
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
  openDetail: (row: AdminNotificationMessageRow) => void | Promise<void>
  openDelete: (row: AdminNotificationMessageRow) => void | Promise<void>
}

interface UseAdminNotificationsDisplayMetaReturn {
  audienceOptions: ComputedRef<Array<AdminNotificationSelectItem<AdminNotificationAudience>>>
  levelOptions: ComputedRef<Array<AdminNotificationSelectItem<MessageLevel>>>
  getAudienceMeta: (audience: AdminNotificationAudience) => AdminNotificationAudienceMeta
  columns: ComputedRef<TableColumn<AdminNotificationMessageRow>[]>
  getRowItems: (row: AdminNotificationMessageRow) => DropdownMenuItem[]
}

type AdminNotificationAudience = 'specific' | 'all_current' | 'all_with_future'

const ADMIN_NOTIFICATION_AUDIENCES: AdminNotificationAudience[] = ['specific', 'all_current', 'all_with_future']
const ADMIN_NOTIFICATION_AUDIENCE_META = {
  specific: { color: 'neutral', labelKey: 'admin.content.notifications.audiences.labels.specific', optionKey: 'admin.content.notifications.audiences.options.specific' },
  all_current: { color: 'info', labelKey: 'admin.content.notifications.audiences.labels.allCurrent', optionKey: 'admin.content.notifications.audiences.options.allCurrent' },
  all_with_future: { color: 'warning', labelKey: 'admin.content.notifications.audiences.labels.allWithFuture', optionKey: 'admin.content.notifications.audiences.options.allWithFuture' }
} as const satisfies Record<AdminNotificationAudience, {
  color: AdminNotificationAudienceMeta['color']
  labelKey: string
  optionKey: string
}>

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
  const { t } = useI18n()
  const audienceOptions = computed<Array<AdminNotificationSelectItem<AdminNotificationAudience>>>(() => (
    ADMIN_NOTIFICATION_AUDIENCES.map(audience => ({
      label: t(ADMIN_NOTIFICATION_AUDIENCE_META[audience].optionKey),
      value: audience
    }))
  ))
  const levelOptions = computed<Array<AdminNotificationSelectItem<MessageLevel>>>(() => MESSAGE_LEVELS.map(level => ({
    label: t(`admin.content.notifications.levelOptions.${level}`),
    value: level
  })))
  const columns = computed<TableColumn<AdminNotificationMessageRow>[]>(() => [
    { accessorKey: 'title', header: t('admin.content.notifications.columns.title') },
    { id: 'delivery', header: t('admin.content.notifications.columns.delivery') },
    { accessorKey: 'senderActor', header: t('admin.content.notifications.columns.sender') },
    { accessorKey: 'createdAt', header: t('admin.content.notifications.columns.sentAt') },
    { id: 'actions', header: '' }
  ])

  function getAudienceMeta(audience: AdminNotificationAudience): AdminNotificationAudienceMeta {
    const meta = ADMIN_NOTIFICATION_AUDIENCE_META[audience]
    return { color: meta.color, label: t(meta.labelKey) }
  }

  function getRowItems(row: AdminNotificationMessageRow): DropdownMenuItem[] {
    return [
      {
        label: t('admin.content.notifications.actions.viewDeliveries'),
        icon: 'i-mdi-account-multiple-outline',
        onSelect: () => options.openDetail(row)
      },
      {
        label: t('common.actions.delete'),
        icon: 'i-mdi-delete-outline',
        color: 'error',
        onSelect: () => options.openDelete(row)
      }
    ]
  }

  return {
    audienceOptions,
    levelOptions,
    getAudienceMeta,
    columns,
    getRowItems
  }
}

import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import { computed, type ComputedRef } from 'vue'
import { MESSAGE_LEVELS, type MessageLevel } from '#shared/types/content'

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

export const MESSAGE_LEVELS = ['info', 'success', 'warning', 'critical'] as const

export type MessageLevel = typeof MESSAGE_LEVELS[number]

export interface MessageLevelMeta {
  color: 'info' | 'success' | 'warning' | 'error'
  icon: string
  label: string
}

export interface Announcement {
  id: number
  title: string
  content: string
  level: MessageLevel
  isPinned: boolean
  isEnabled: boolean
  linkUrl: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface FriendLinkItem {
  id: number
  title: string
  url: string
  description: string | null
  isActive: boolean
}

const MESSAGE_LEVEL_META: Record<MessageLevel, Omit<MessageLevelMeta, 'label'>> = {
  info: { color: 'info', icon: 'i-mdi-information-outline' },
  success: { color: 'success', icon: 'i-mdi-check-circle-outline' },
  warning: { color: 'warning', icon: 'i-mdi-alert-outline' },
  critical: { color: 'error', icon: 'i-mdi-alert-circle-outline' }
}

function createMessageLevelMeta(labels: Record<MessageLevel, string>): Record<MessageLevel, MessageLevelMeta> {
  return Object.fromEntries(
    MESSAGE_LEVELS.map(level => [level, { ...MESSAGE_LEVEL_META[level], label: labels[level] }])
  ) as Record<MessageLevel, MessageLevelMeta>
}

export const NOTIFICATION_LEVEL_META = createMessageLevelMeta({
  info: '通知',
  success: '成功',
  warning: '提醒',
  critical: '紧急'
})

export const ANNOUNCEMENT_LEVEL_META = createMessageLevelMeta({
  info: '公告',
  success: '通知',
  warning: '提醒',
  critical: '紧急'
})

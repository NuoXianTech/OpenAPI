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

const MESSAGE_LEVEL_STYLE: Record<MessageLevel, { color: MessageLevelMeta['color'], icon: string }> = {
  info: { color: 'info', icon: 'i-mdi-information-outline' },
  success: { color: 'success', icon: 'i-mdi-check-circle-outline' },
  warning: { color: 'warning', icon: 'i-mdi-alert-outline' },
  critical: { color: 'error', icon: 'i-mdi-alert-circle-outline' }
}

export const NOTIFICATION_LEVEL_META: Record<MessageLevel, MessageLevelMeta> = {
  info: { ...MESSAGE_LEVEL_STYLE.info, label: '通知' },
  success: { ...MESSAGE_LEVEL_STYLE.success, label: '成功' },
  warning: { ...MESSAGE_LEVEL_STYLE.warning, label: '提醒' },
  critical: { ...MESSAGE_LEVEL_STYLE.critical, label: '紧急' }
}

export const ANNOUNCEMENT_LEVEL_META: Record<MessageLevel, MessageLevelMeta> = {
  info: { ...MESSAGE_LEVEL_STYLE.info, label: '公告' },
  success: { ...MESSAGE_LEVEL_STYLE.success, label: '通知' },
  warning: { ...MESSAGE_LEVEL_STYLE.warning, label: '提醒' },
  critical: { ...MESSAGE_LEVEL_STYLE.critical, label: '紧急' }
}

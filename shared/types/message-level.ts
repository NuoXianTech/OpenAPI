export type MessageLevel = 'info' | 'success' | 'warning' | 'critical'

export interface MessageLevelMeta {
  color: 'info' | 'success' | 'warning' | 'error'
  icon: string
  label: string
}

const MESSAGE_LEVEL_STYLE: Record<MessageLevel, { color: MessageLevelMeta['color'], icon: string }> = {
  info: { color: 'info', icon: 'i-lucide-info' },
  success: { color: 'success', icon: 'i-lucide-circle-check' },
  warning: { color: 'warning', icon: 'i-lucide-triangle-alert' },
  critical: { color: 'error', icon: 'i-lucide-circle-alert' }
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

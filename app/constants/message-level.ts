import type { MessageLevel } from '#shared/types/content'

export interface MessageLevelMeta {
  color: 'info' | 'success' | 'warning' | 'error'
  icon: string
}

export const MESSAGE_LEVEL_META: Record<MessageLevel, MessageLevelMeta> = {
  info: { color: 'info', icon: 'i-mdi-information-outline' },
  success: { color: 'success', icon: 'i-mdi-check-circle-outline' },
  warning: { color: 'warning', icon: 'i-mdi-alert-outline' },
  critical: { color: 'error', icon: 'i-mdi-alert-circle-outline' }
}

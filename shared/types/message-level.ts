/**
 * 站内消息 / 公告等级的展示元数据。
 *
 * color + icon 在所有场景一致；仅 label 因「通知」与「公告」两种语境而不同，
 * 故拆成 NOTIFICATION_LEVEL_META / ANNOUNCEMENT_LEVEL_META 两份导出，
 * 共用同一份 STYLE 避免 color/icon 重复。与 LOGIN_METHOD_META 同属集中元数据风格。
 */
export type MessageLevel = 'info' | 'success' | 'warning' | 'critical'

export interface MessageLevelMeta {
  color: 'info' | 'success' | 'warning' | 'error'
  icon: string
  label: string
}

const STYLE: Record<MessageLevel, { color: MessageLevelMeta['color'], icon: string }> = {
  info: { color: 'info', icon: 'i-mdi-information-outline' },
  success: { color: 'success', icon: 'i-mdi-check-circle-outline' },
  warning: { color: 'warning', icon: 'i-mdi-alert-outline' },
  critical: { color: 'error', icon: 'i-mdi-alert-circle-outline' }
}

/** 站内通知语境：info=通知、success=成功 */
export const NOTIFICATION_LEVEL_META: Record<MessageLevel, MessageLevelMeta> = {
  info: { ...STYLE.info, label: '通知' },
  success: { ...STYLE.success, label: '成功' },
  warning: { ...STYLE.warning, label: '提醒' },
  critical: { ...STYLE.critical, label: '紧急' }
}

/** 公告语境：info=公告、success=通知 */
export const ANNOUNCEMENT_LEVEL_META: Record<MessageLevel, MessageLevelMeta> = {
  info: { ...STYLE.info, label: '公告' },
  success: { ...STYLE.success, label: '通知' },
  warning: { ...STYLE.warning, label: '提醒' },
  critical: { ...STYLE.critical, label: '紧急' }
}

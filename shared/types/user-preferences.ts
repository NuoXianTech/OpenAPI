import type { SupportedLocale } from '#shared/config/locale-defaults'

/**
 * 用户偏好预留模型。
 * locale 对应 users.locale；null 表示未主动设置。
 */
export interface UserPreferences {
  locale: SupportedLocale | null
}

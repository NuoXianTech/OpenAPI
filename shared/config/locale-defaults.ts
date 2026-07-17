/** 与 @nuxtjs/i18n 的 locales 配置保持一致。 */
export const SUPPORTED_LOCALES = ['zh-CN'] as const

export type SupportedLocale = typeof SUPPORTED_LOCALES[number]

export const DEFAULT_LOCALE: SupportedLocale = 'zh-CN'

/** 游客语言偏好的 Cookie 名称，由 @nuxtjs/i18n 读写。 */
export const LOCALE_COOKIE_NAME = 'site_locale'

export function isSupportedLocale(value: string | null | undefined): value is SupportedLocale {
  return value !== null && value !== undefined
    && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

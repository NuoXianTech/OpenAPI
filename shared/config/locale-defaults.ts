/**
 * i18n 预留配置。
 *
 * 安装 @nuxtjs/i18n 后，模块的 locales/defaultLocale 与此处保持一致。
 * 当前仅作为统一约定，不会改变现有路由或加载翻译资源。
 */
export const SUPPORTED_LOCALES = ['zh-CN', 'en-US'] as const

export type SupportedLocale = typeof SUPPORTED_LOCALES[number]

export const DEFAULT_LOCALE: SupportedLocale = 'zh-CN'

/** 游客语言偏好的 Cookie 名称，后续由 i18n 初始化流程读写。 */
export const LOCALE_COOKIE_NAME = 'site_locale'

export function isSupportedLocale(value: string | null | undefined): value is SupportedLocale {
  return value !== null && value !== undefined
    && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

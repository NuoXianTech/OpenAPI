/**
 * 站点公开设置类型（/api/settings/public 返回结构）。
 *
 * - server: siteSettingsService.toPublicSettings 返回此结构
 * - client: useSiteSettings() 读取此结构
 * 双端必须保持同源，避免新增字段时只改一边。
 */

export interface PublicTurnstileSettings {
  enabled: boolean
  siteKey: string
  login: boolean
  register: boolean
  adminLogin: boolean
  passwordReset: boolean
  checkin: boolean
}

export type RegistrationMode = 'open' | 'invite' | 'closed'

export interface PublicSiteSettings {
  siteUrl: string
  siteImg: string
  siteName: string
  siteDescription: string
  startTime: string
  icpBeian: string | null
  policeBeian: string | null
  termsUrl: string | null
  privacyUrl: string | null
  registrationMode: RegistrationMode | string
  passwordResetEnabled: boolean
  turnstile: PublicTurnstileSettings
}

import { PUBLIC_SITE_DEFAULTS } from '~~/shared/config/siteDefaults'

export const PUBLIC_SITE_SETTINGS_KEY = 'public-site-settings'

export interface PublicTurnstileSettings {
  enabled: boolean
  siteKey: string
  login: boolean
  register: boolean
  adminLogin: boolean
  passwordReset: boolean
}

export interface PublicAnnouncementSettings {
  showOnHome: boolean
}

export interface PublicSiteSettings {
  siteUrl: string
  siteImg: string
  siteName: string
  siteDescription: string
  startTime: string
  passwordResetEnabled: boolean
  turnstile: PublicTurnstileSettings
  announcement: PublicAnnouncementSettings
}

const EMPTY_TURNSTILE: PublicTurnstileSettings = {
  enabled: false,
  siteKey: '',
  login: false,
  register: false,
  adminLogin: false,
  passwordReset: false
}

const EMPTY_ANNOUNCEMENT: PublicAnnouncementSettings = {
  showOnHome: false
}

// DB 是唯一权威源；以下兜底仅在 /api/settings/public 请求异常时使用。
// 基础字段（siteUrl/siteName 等）从 shared/config/siteDefaults 取，与 schema 默认值同源。
const FALLBACK_SETTINGS: PublicSiteSettings = {
  ...PUBLIC_SITE_DEFAULTS,
  turnstile: { ...EMPTY_TURNSTILE },
  announcement: { ...EMPTY_ANNOUNCEMENT }
}

export function useSiteSettings() {
  const { data, pending, error, refresh } = useFetch<PublicSiteSettings>(
    '/api/settings/public',
    {
      key: PUBLIC_SITE_SETTINGS_KEY,
      default: () => FALLBACK_SETTINGS
    }
  )

  const settings = computed(() => data.value || FALLBACK_SETTINGS)
  const turnstile = computed<PublicTurnstileSettings>(() => settings.value.turnstile || EMPTY_TURNSTILE)
  const announcement = computed<PublicAnnouncementSettings>(() => settings.value.announcement || EMPTY_ANNOUNCEMENT)
  const passwordResetEnabled = computed(() => settings.value.passwordResetEnabled !== false)

  return {
    settings,
    turnstile,
    announcement,
    passwordResetEnabled,
    pending,
    error,
    refresh
  }
}

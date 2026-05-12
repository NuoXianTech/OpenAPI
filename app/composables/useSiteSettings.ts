interface PublicTurnstileSettings {
  enabled: boolean
  siteKey: string
  login: boolean
  register: boolean
  adminLogin: boolean
  passwordReset: boolean
}

interface PublicAnnouncementSettings {
  showOnHome: boolean
}

interface PublicSiteSettings {
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

// DB 是唯一权威源；以下兜底仅在 /api/settings/public 请求异常时使用，
// 字段与 server/db/schema/system.ts 中 siteSettings 表的 default 对齐。
const FALLBACK_SETTINGS: PublicSiteSettings = {
  siteUrl: 'http://localhost:3000',
  siteImg: '/favicon.ico',
  siteName: 'OpenAPI',
  siteDescription: 'OpenAPI是免费为用户提供网络数据接口调用的服务平台。',
  startTime: '2026-01-01 00:00:00',
  passwordResetEnabled: true,
  turnstile: { ...EMPTY_TURNSTILE },
  announcement: { ...EMPTY_ANNOUNCEMENT }
}

export function useSiteSettings() {
  const { data, pending, error, refresh } = useAsyncData(
    'public-site-settings',
    () => $fetch<PublicSiteSettings>('/api/settings/public'),
    {
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

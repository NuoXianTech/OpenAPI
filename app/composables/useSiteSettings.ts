interface PublicTurnstileSettings {
  enabled: boolean
  siteKey: string
  login: boolean
  register: boolean
  adminLogin: boolean
  publicStats: boolean
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

interface PublicSiteSettingsResponse {
  code: number
  msg: string
  data: PublicSiteSettings
}

const EMPTY_TURNSTILE: PublicTurnstileSettings = {
  enabled: false,
  siteKey: '',
  login: false,
  register: false,
  adminLogin: false,
  publicStats: false,
  passwordReset: false,
}

const EMPTY_ANNOUNCEMENT: PublicAnnouncementSettings = {
  showOnHome: false,
}

export function useSiteSettings() {
  const runtimePublic = useRuntimeConfig().public

  const fallback: PublicSiteSettings = {
    siteUrl: runtimePublic.siteUrl || 'http://localhost:3000',
    siteImg: runtimePublic.siteImg || 'https://q1.qlogo.cn/g?b=qq&nk=1428309052&s=640',
    siteName: runtimePublic.siteName || 'OpenAPI',
    siteDescription:
      runtimePublic.siteDescription
      || 'OpenAPI是免费为用户提供网络数据接口调用的服务平台。',
    startTime: runtimePublic.startTime || '2026-01-01 00:00:00',
    passwordResetEnabled: true,
    turnstile: { ...EMPTY_TURNSTILE },
    announcement: { ...EMPTY_ANNOUNCEMENT },
  }

  const { data, pending, error, refresh } = useAsyncData(
    'public-site-settings',
    () => $fetch<PublicSiteSettingsResponse>('/api/settings/public'),
    {
      default: () => ({
        code: 0,
        msg: 'ok',
        data: fallback,
      }),
    },
  )

  const settings = computed(() => data.value?.data || fallback)
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
    refresh,
  }
}

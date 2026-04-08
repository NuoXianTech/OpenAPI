interface PublicSiteSettings {
  siteUrl: string
  siteImg: string
  siteName: string
  siteDescription: string
  startTime: string
}

interface PublicSiteSettingsResponse {
  code: number
  msg: string
  data: PublicSiteSettings
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

  return {
    settings,
    pending,
    error,
    refresh,
  }
}

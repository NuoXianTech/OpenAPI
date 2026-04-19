import { oauthProviderService } from '~~/server/service/oauthProviderService'
import { siteSettingsService } from '~~/server/service/siteSettingsService'
import { isSupportedOauthProvider } from '~~/shared/types/oauth'

export default defineEventHandler(async () => {
  const settings = await siteSettingsService.getOrCreate()
  if (!settings.oauthLoginEnabled) {
    return { code: 0, msg: 'ok', data: [] }
  }
  const list = await oauthProviderService.listEnabledPublic()
  return {
    code: 0,
    msg: 'ok',
    data: list
      .filter(item => isSupportedOauthProvider(item.provider))
      .map((item: { provider: string, displayName: string, icon: string | null, sortOrder: number }) => ({
        provider: item.provider,
        displayName: item.displayName,
        icon: item.icon,
        authorizeEntry: `/api/auth/oauth/${item.provider}/start`,
      })),
  }
})

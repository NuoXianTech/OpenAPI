import { oauthProviderService } from '~~/server/service/oauthProviderService'
import { siteSettingsService } from '~~/server/service/siteSettingsService'
import { OAUTH_PROVIDER_PRESETS } from '~~/shared/types/oauth'

export default defineEventHandler(async () => {
  const settings = await siteSettingsService.getOrCreate()
  if (!settings.oauthLoginEnabled) {
    return []
  }
  const enabled = await oauthProviderService.listEnabledProviders()
  return enabled.map((provider) => {
    const preset = OAUTH_PROVIDER_PRESETS[provider]
    return {
      provider,
      displayName: preset.displayName,
      icon: preset.icon,
      authorizeEntry: `/api/auth/oauth/${provider}/start`
    }
  })
})

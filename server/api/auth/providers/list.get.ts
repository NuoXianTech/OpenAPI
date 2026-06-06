import { oauthProviderService } from '~~/server/service/oauthProviderService'
import { OAUTH_PROVIDER_PRESETS } from '~~/shared/types/oauth'

export default defineEventHandler(async () => {
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

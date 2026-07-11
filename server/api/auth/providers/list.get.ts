import { oauthProviderService } from '~~/server/services/oauth-provider-service'
import { OAUTH_PROVIDER_PRESETS } from '~~/server/config/oauth-provider-presets'

export default defineEventHandler(async () => {
  const enabledProviders = await oauthProviderService.listEnabledProviders()

  return enabledProviders.map((provider) => {
    const preset = OAUTH_PROVIDER_PRESETS[provider]

    return {
      provider,
      displayName: preset.displayName,
      icon: preset.icon,
      authorizeEntry: `/api/auth/oauth/${provider}/start`
    }
  })
})

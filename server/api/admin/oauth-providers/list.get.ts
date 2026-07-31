import { defineAdminEventHandler } from '~~/server/utils/auth'
import { buildCallbackUrl, oauthProviderService, toAdminOauthProviderSafe, type OauthProviderRow } from '~~/server/services/oauth-provider-service'
import { systemSettingsService } from '~~/server/services/system-settings-service'
import { OAUTH_PROVIDER_PRESETS } from '~~/server/config/oauth-provider-presets'

export default defineAdminEventHandler(async () => {
  const [rows, settings] = await Promise.all([
    oauthProviderService.list(),
    systemSettingsService.getSettings()
  ])
  const data = rows.map((row: OauthProviderRow) => {
    const preset = OAUTH_PROVIDER_PRESETS[row.provider]
    const safe = toAdminOauthProviderSafe(row)
    return {
      provider: safe.provider,
      displayName: preset.displayName,
      icon: preset.icon,
      scopes: preset.scopes,
      clientId: safe.clientId,
      clientSecret: safe.clientSecret,
      isEnabled: safe.isEnabled,
      callbackUrl: buildCallbackUrl(settings.siteUrl, row.provider),
      authorizeUrl: preset.authorizeUrl,
      tokenUrl: preset.tokenUrl,
      userInfoUrl: preset.userInfoUrl
    }
  })
  return data
})

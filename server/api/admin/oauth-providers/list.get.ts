import type { H3Event } from 'h3'
import { requireAdmin } from '~~/server/utils/auth'
import { buildCallbackUrl, oauthProviderService, toAdminOauthProviderSafe, type OauthProviderRow } from '~~/server/services/oauth-provider-service'
import { siteSettingsService } from '~~/server/services/site-settings-service'
import { OAUTH_PROVIDER_PRESETS, type SupportedOauthProvider } from '~~/shared/types/oauth'

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  const [rows, settings] = await Promise.all([
    oauthProviderService.list(),
    siteSettingsService.getOrCreate()
  ])
  const data = rows.map((row: OauthProviderRow) => {
    const preset = OAUTH_PROVIDER_PRESETS[row.provider as SupportedOauthProvider]
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

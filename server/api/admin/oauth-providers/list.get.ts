import type { H3Event } from 'h3'
import { requireAdmin } from '~~/server/utils/auth'
import { buildCallbackUrl, oauthProviderService, type OauthProviderRow } from '~~/server/service/oauthProviderService'
import { siteSettingsService } from '~~/server/service/siteSettingsService'
import { OAUTH_PROVIDER_PRESETS, type SupportedOauthProvider } from '~~/shared/types/oauth'

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  const [rows, settings] = await Promise.all([
    oauthProviderService.list(),
    siteSettingsService.getOrCreate()
  ])
  const data = rows.map((row: OauthProviderRow) => {
    const preset = OAUTH_PROVIDER_PRESETS[row.provider as SupportedOauthProvider]
    return {
      provider: row.provider,
      displayName: preset.displayName,
      icon: preset.icon,
      scopes: preset.scopes,
      clientId: row.clientId,
      // 只回传"是否已配置"提示，不把明文 secret 发到浏览器（admin UI 对 secret 是只写模式）
      clientSecret: row.clientSecret ? '***' : '',
      isEnabled: row.isEnabled,
      callbackUrl: buildCallbackUrl(settings.siteUrl, row.provider),
      authorizeUrl: preset.authorizeUrl,
      tokenUrl: preset.tokenUrl,
      userInfoUrl: preset.userInfoUrl
    }
  })
  return data
})

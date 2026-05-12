// 列出当前用户的所有第三方绑定 + 站点上启用的 provider 元信息（供前端渲染绑定/解绑按钮）
import type { H3Event } from 'h3'
import { oauthAccountService } from '~~/server/service/oauthAccountService'
import { oauthProviderService } from '~~/server/service/oauthProviderService'
import { siteSettingsService } from '~~/server/service/siteSettingsService'
import { OAUTH_PROVIDER_PRESETS, isSupportedOauthProvider } from '~~/shared/types/oauth'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  const authUser = await requireAuth(event)

  const settings = await siteSettingsService.getOrCreate()
  const oauthEnabled = !!settings.oauthLoginEnabled

  const [bound, enabled] = await Promise.all([
    oauthAccountService.listSafeByUserId(authUser.id),
    oauthEnabled ? oauthProviderService.listEnabledProviders() : Promise.resolve([] as string[])
  ])

  // 把已启用的 provider 与已绑定的账号合并成一个统一的列表，前端按 provider 一一渲染
  const map = new Map<string, {
    provider: string
    displayName: string
    icon: string
    enabled: boolean
    bound: boolean
    nickname: string | null
    email: string | null
    avatarUrl: string | null
    providerUserId: string | null
    linkedAt: string | null
  }>()

  for (const provider of enabled) {
    if (!isSupportedOauthProvider(provider)) continue
    const preset = OAUTH_PROVIDER_PRESETS[provider]
    map.set(provider, {
      provider,
      displayName: preset.displayName,
      icon: preset.icon,
      enabled: true,
      bound: false,
      nickname: null,
      email: null,
      avatarUrl: null,
      providerUserId: null,
      linkedAt: null
    })
  }

  for (const acc of bound) {
    const preset = isSupportedOauthProvider(acc.provider)
      ? OAUTH_PROVIDER_PRESETS[acc.provider]
      : { displayName: acc.provider, icon: 'i-mdi-link-variant' }
    const item = map.get(acc.provider) || {
      provider: acc.provider,
      displayName: preset.displayName,
      icon: preset.icon,
      enabled: false, // 已经绑定但 provider 当前被站点关掉了 → 仍展示，可解绑
      bound: false,
      nickname: null,
      email: null,
      avatarUrl: null,
      providerUserId: null,
      linkedAt: null
    }
    item.bound = true
    item.nickname = acc.nickname
    item.email = acc.email
    item.avatarUrl = acc.avatarUrl
    item.providerUserId = acc.providerUserId
    item.linkedAt = acc.linkedAt instanceof Date
      ? acc.linkedAt.toISOString()
      : (acc.linkedAt ? new Date(acc.linkedAt).toISOString() : null)
    map.set(acc.provider, item)
  }

  return {
    oauthEnabled,
    providers: Array.from(map.values())
  }
})

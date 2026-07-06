// 列出当前用户的所有第三方绑定 + 站点上启用的 provider 元信息（供前端渲染绑定/解绑按钮）
import type { H3Event } from 'h3'
import { oauthAccountService } from '~~/server/services/oauth-account-service'
import { oauthProviderService } from '~~/server/services/oauth-provider-service'
import { OAUTH_PROVIDER_PRESETS, isSupportedOauthProvider } from '~~/shared/types/oauth'
import { requireAuth } from '~~/server/utils/auth'
import { toNullableIsoString } from '~~/server/utils/date'

// 显式声明形状：drizzle 的 select().from().where() 在某些链上推不出元素类型，
// listSafeByUserId 的 Awaited 也会随之降级为 any[]，导致下面索引 OAUTH_PROVIDER_PRESETS 失败。
interface BoundOauthAccount {
  id: number
  provider: string
  providerUserId: string
  nickname: string | null
  avatarUrl: string | null
  email: string | null
  linkedAt: Date | string | null
  lastLoginAt: Date | string | null
}

export default defineEventHandler(async (event: H3Event) => {
  const authUser = await requireAuth(event)

  const [bound, enabled] = await Promise.all([
    oauthAccountService.listSafeByUserId(authUser.id),
    oauthProviderService.listEnabledProviders()
  ])
  // 无全局总开关：有任一 provider 启用即视为可用（已有绑定仍照常展示，可解绑）
  const oauthEnabled = enabled.length > 0

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

  for (const acc of bound as BoundOauthAccount[]) {
    const preset = isSupportedOauthProvider(acc.provider)
      ? OAUTH_PROVIDER_PRESETS[acc.provider]
      : { displayName: acc.provider, icon: 'i-lucide-link' }
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
    item.linkedAt = toNullableIsoString(acc.linkedAt)
    map.set(acc.provider, item)
  }

  return {
    oauthEnabled,
    providers: Array.from(map.values())
  }
})

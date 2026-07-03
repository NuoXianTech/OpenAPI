export const SUPPORTED_OAUTH_PROVIDERS = ['github', 'qq'] as const
export type SupportedOauthProvider = typeof SUPPORTED_OAUTH_PROVIDERS[number]

interface OauthProviderPreset {
  provider: SupportedOauthProvider
  displayName: string
  icon: string
  scopes: string[]
  authorizeUrl: string
  tokenUrl: string
  userInfoUrl: string
}

export const OAUTH_PROVIDER_PRESETS: Record<SupportedOauthProvider, OauthProviderPreset> = {
  github: {
    provider: 'github',
    displayName: 'GitHub',
    icon: 'i-mdi-github',
    scopes: ['read:user', 'user:email'],
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user'
  },
  qq: {
    provider: 'qq',
    displayName: 'QQ',
    icon: 'i-mdi-qqchat',
    scopes: ['get_user_info'],
    authorizeUrl: 'https://graph.qq.com/oauth2.0/authorize',
    tokenUrl: 'https://graph.qq.com/oauth2.0/token',
    userInfoUrl: 'https://graph.qq.com/user/get_user_info'
  }
}

export function isSupportedOauthProvider(value: unknown): value is SupportedOauthProvider {
  return typeof value === 'string' && (SUPPORTED_OAUTH_PROVIDERS as readonly string[]).includes(value)
}

/**
 * provider 与回调路径中数字索引的映射，索引顺序与 SUPPORTED_OAUTH_PROVIDERS 一致：
 * 0 → github, 1 → qq
 *
 * 回调 URL 形如 `${siteUrl}/callback/openid/{index}`，让多个 OAuth 应用使用统一前缀，
 * 第三方平台白名单也只需登记一个固定路径前缀。
 */
export function providerIndex(provider: SupportedOauthProvider): number {
  return SUPPORTED_OAUTH_PROVIDERS.indexOf(provider)
}

export function providerByIndex(index: number): SupportedOauthProvider | null {
  return SUPPORTED_OAUTH_PROVIDERS[index] ?? null
}

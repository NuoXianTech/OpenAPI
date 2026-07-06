import type { SupportedOauthProvider } from '~~/shared/types/oauth'

export interface OauthProviderPreset {
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
    icon: 'i-lucide-github',
    scopes: ['read:user', 'user:email'],
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user'
  },
  qq: {
    provider: 'qq',
    displayName: 'QQ',
    icon: 'i-lucide-message-circle',
    scopes: ['get_user_info'],
    authorizeUrl: 'https://graph.qq.com/oauth2.0/authorize',
    tokenUrl: 'https://graph.qq.com/oauth2.0/token',
    userInfoUrl: 'https://graph.qq.com/user/get_user_info'
  }
}

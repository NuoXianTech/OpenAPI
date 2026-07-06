export const SUPPORTED_OAUTH_PROVIDERS = ['github', 'qq'] as const
export type SupportedOauthProvider = typeof SUPPORTED_OAUTH_PROVIDERS[number]

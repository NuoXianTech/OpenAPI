export interface ProviderConfig {
  clientId: string
  clientSecret: string
  callbackUrl: string
}

export interface ProviderProfile {
  providerUserId: string
  email: string | null
  nickname: string | null
  avatarUrl: string | null
  profileRaw: Record<string, unknown>
}

/**
 * 仅作回调流程内的临时载体：
 * 项目用 OAuth 仅用于身份识别，不调用上游 API，因此 access_token 用完即丢，
 * refresh_token / scope / 过期时间不再持久化。
 */
export interface TokenResult {
  accessToken: string
}

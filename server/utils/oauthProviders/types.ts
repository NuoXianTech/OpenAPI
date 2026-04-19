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
  scope: string | null
  profileRaw: Record<string, unknown>
}

export interface TokenResult {
  accessToken: string
  refreshToken: string | null
  tokenExpiresAt: Date | null
  scope: string | null
}

export interface ProviderConfig {
  provider: string
  clientId: string
  clientSecret: string
  scopes: string[]
  callbackUrl: string
  authorizeUrl: string | null
  tokenUrl: string | null
  userInfoUrl: string | null
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

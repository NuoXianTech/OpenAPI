import { createError } from 'h3'

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

const DEFAULT_AUTHORIZE = 'https://github.com/login/oauth/authorize'
const DEFAULT_TOKEN = 'https://github.com/login/oauth/access_token'
const DEFAULT_USERINFO = 'https://api.github.com/user'
const EMAILS_URL = 'https://api.github.com/user/emails'

export function buildAuthorizeUrl(config: ProviderConfig, state: string): string {
  const base = config.authorizeUrl || DEFAULT_AUTHORIZE
  const url = new URL(base)
  url.searchParams.set('client_id', config.clientId)
  url.searchParams.set('redirect_uri', config.callbackUrl)
  url.searchParams.set('state', state)
  if (config.scopes.length) {
    url.searchParams.set('scope', config.scopes.join(' '))
  }
  url.searchParams.set('allow_signup', 'true')
  return url.toString()
}

export async function exchangeCode(config: ProviderConfig, code: string): Promise<TokenResult> {
  const tokenUrl = config.tokenUrl || DEFAULT_TOKEN
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: config.callbackUrl,
  })

  const response = await $fetch<{
    access_token?: string
    refresh_token?: string
    expires_in?: number
    scope?: string
    error?: string
    error_description?: string
  }>(tokenUrl, {
    method: 'POST',
    body,
    headers: { Accept: 'application/json' },
  })

  if (!response?.access_token) {
    throw createError({ statusCode: 502, message: response?.error_description || response?.error || 'github token exchange failed' })
  }

  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token || null,
    tokenExpiresAt: response.expires_in ? new Date(Date.now() + response.expires_in * 1000) : null,
    scope: response.scope || null,
  }
}

export async function fetchUserInfo(config: ProviderConfig, accessToken: string, token: TokenResult): Promise<ProviderProfile> {
  const userUrl = config.userInfoUrl || DEFAULT_USERINFO
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'OpenAPI-Auth',
  }

  const profile = await $fetch<Record<string, unknown>>(userUrl, { headers })
  if (!profile || typeof profile !== 'object') {
    throw createError({ statusCode: 502, message: 'github userinfo fetch failed' })
  }

  let email = typeof profile.email === 'string' && profile.email ? profile.email : null
  if (!email) {
    try {
      const emails = await $fetch<Array<{ email: string, primary: boolean, verified: boolean }>>(EMAILS_URL, { headers })
      const primary = emails.find(item => item.primary && item.verified) || emails.find(item => item.verified) || emails[0]
      email = primary?.email || null
    }
    catch {
      email = null
    }
  }

  const providerUserId = profile.id !== undefined && profile.id !== null ? String(profile.id) : ''
  if (!providerUserId) {
    throw createError({ statusCode: 502, message: 'github userinfo missing id' })
  }

  return {
    providerUserId,
    email,
    nickname: (typeof profile.name === 'string' && profile.name) || (typeof profile.login === 'string' ? profile.login : null),
    avatarUrl: typeof profile.avatar_url === 'string' ? profile.avatar_url : null,
    scope: token.scope,
    profileRaw: profile,
  }
}

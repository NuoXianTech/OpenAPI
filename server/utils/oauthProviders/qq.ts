import { createError } from 'h3'
import type { ProviderConfig, ProviderProfile, TokenResult } from './types'

const DEFAULT_AUTHORIZE = 'https://graph.qq.com/oauth2.0/authorize'
const DEFAULT_TOKEN = 'https://graph.qq.com/oauth2.0/token'
const DEFAULT_USERINFO = 'https://graph.qq.com/user/get_user_info'
const OPENID_URL = 'https://graph.qq.com/oauth2.0/me'

export function buildAuthorizeUrl(config: ProviderConfig, state: string): string {
  const base = config.authorizeUrl || DEFAULT_AUTHORIZE
  const url = new URL(base)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', config.clientId)
  url.searchParams.set('redirect_uri', config.callbackUrl)
  url.searchParams.set('state', state)
  url.searchParams.set('scope', (config.scopes.length ? config.scopes : ['get_user_info']).join(','))
  return url.toString()
}

export async function exchangeCode(config: ProviderConfig, code: string): Promise<TokenResult> {
  const tokenUrl = config.tokenUrl || DEFAULT_TOKEN
  const url = new URL(tokenUrl)
  url.searchParams.set('grant_type', 'authorization_code')
  url.searchParams.set('client_id', config.clientId)
  url.searchParams.set('client_secret', config.clientSecret)
  url.searchParams.set('code', code)
  url.searchParams.set('redirect_uri', config.callbackUrl)
  url.searchParams.set('fmt', 'json')

  const response = await $fetch<{
    access_token?: string
    refresh_token?: string
    expires_in?: number | string
    error?: number | string
    error_description?: string
  }>(url.toString(), { method: 'GET' })

  if (!response?.access_token) {
    throw createError({
      statusCode: 502,
      message: response?.error_description || (response?.error ? `qq error ${response.error}` : 'qq token exchange failed'),
    })
  }

  const expiresIn = Number(response.expires_in) || 0
  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token || null,
    tokenExpiresAt: expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000) : null,
    scope: null,
  }
}

interface QqOpenIdResponse {
  client_id?: string
  openid?: string
  unionid?: string
  error?: number | string
  error_description?: string
}

async function fetchOpenId(accessToken: string): Promise<{ openid: string, unionid: string | null }> {
  const url = new URL(OPENID_URL)
  url.searchParams.set('access_token', accessToken)
  url.searchParams.set('fmt', 'json')
  url.searchParams.set('unionid', '1')

  const response = await $fetch<QqOpenIdResponse>(url.toString())
  if (!response || !response.openid) {
    throw createError({
      statusCode: 502,
      message: response?.error_description || 'qq openid fetch failed',
    })
  }
  return {
    openid: response.openid,
    unionid: response.unionid || null,
  }
}

interface QqUserInfoResponse extends Record<string, unknown> {
  ret?: number
  msg?: string
  nickname?: string
  figureurl_qq_2?: string
  figureurl_qq_1?: string
  figureurl_qq?: string
  figureurl_2?: string
  figureurl_1?: string
  figureurl?: string
}

export async function fetchUserInfo(config: ProviderConfig, accessToken: string, _token: TokenResult): Promise<ProviderProfile> {
  const { openid, unionid } = await fetchOpenId(accessToken)

  const userUrl = config.userInfoUrl || DEFAULT_USERINFO
  const url = new URL(userUrl)
  url.searchParams.set('access_token', accessToken)
  url.searchParams.set('oauth_consumer_key', config.clientId)
  url.searchParams.set('openid', openid)

  const profile = await $fetch<QqUserInfoResponse>(url.toString())
  if (!profile || typeof profile !== 'object') {
    throw createError({ statusCode: 502, message: 'qq userinfo fetch failed' })
  }
  if (typeof profile.ret === 'number' && profile.ret !== 0) {
    throw createError({ statusCode: 502, message: profile.msg || `qq userinfo ret ${profile.ret}` })
  }

  const avatarUrl
    = profile.figureurl_qq_2
      || profile.figureurl_qq_1
      || profile.figureurl_qq
      || profile.figureurl_2
      || profile.figureurl_1
      || profile.figureurl
      || null

  return {
    providerUserId: unionid || openid,
    email: null,
    nickname: typeof profile.nickname === 'string' && profile.nickname ? profile.nickname : null,
    avatarUrl,
    scope: null,
    profileRaw: { ...profile, openid, unionid },
  }
}

import { createError } from 'h3'
import type { OauthProviderModule, ProviderConfig, ProviderProfile, TokenResult } from './types'

const AUTHORIZE_URL = 'https://graph.qq.com/oauth2.0/authorize'
const TOKEN_URL = 'https://graph.qq.com/oauth2.0/token'
const USERINFO_URL = 'https://graph.qq.com/user/get_user_info'
const OPENID_URL = 'https://graph.qq.com/oauth2.0/me'
const SCOPE = 'get_user_info'

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
      message: response?.error_description || 'qq openid fetch failed'
    })
  }
  return {
    openid: response.openid,
    unionid: response.unionid || null
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

/**
 * QQ OAuth provider 实现。
 *
 * 用对象命名空间导出，避免与 github.ts 顶层同名 export 触发 nitro auto-import 冲突。
 * 调用方：`import { qqProvider } from '~~/server/utils/oauth-providers/qq'`
 */
export const qqProvider: OauthProviderModule = {
  buildAuthorizeUrl(config: ProviderConfig, state: string): string {
    const url = new URL(AUTHORIZE_URL)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('client_id', config.clientId)
    url.searchParams.set('redirect_uri', config.callbackUrl)
    url.searchParams.set('state', state)
    url.searchParams.set('scope', SCOPE)
    return url.toString()
  },

  async exchangeCode(config: ProviderConfig, code: string): Promise<TokenResult> {
    const url = new URL(TOKEN_URL)
    url.searchParams.set('grant_type', 'authorization_code')
    url.searchParams.set('client_id', config.clientId)
    url.searchParams.set('client_secret', config.clientSecret)
    url.searchParams.set('code', code)
    url.searchParams.set('redirect_uri', config.callbackUrl)
    url.searchParams.set('fmt', 'json')

    const response = await $fetch<{
      access_token?: string
      error?: number | string
      error_description?: string
    }>(url.toString(), { method: 'GET' })

    if (!response?.access_token) {
      throw createError({
        statusCode: 502,
        message: response?.error_description || (response?.error ? `qq error ${response.error}` : 'qq token exchange failed')
      })
    }

    return {
      accessToken: response.access_token
    }
  },

  async fetchUserInfo(config: ProviderConfig, accessToken: string, _token: TokenResult): Promise<ProviderProfile> {
    const { openid, unionid } = await fetchOpenId(accessToken)

    const url = new URL(USERINFO_URL)
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
      avatarUrl
    }
  }
}

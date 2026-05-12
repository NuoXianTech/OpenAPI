import { createError } from 'h3'
import type { OauthProviderModule, ProviderConfig, ProviderProfile, TokenResult } from './types'

const AUTHORIZE_URL = 'https://github.com/login/oauth/authorize'
const TOKEN_URL = 'https://github.com/login/oauth/access_token'
const USERINFO_URL = 'https://api.github.com/user'
const EMAILS_URL = 'https://api.github.com/user/emails'
const SCOPES = ['read:user', 'user:email']

/**
 * GitHub OAuth provider 实现。
 *
 * 用对象命名空间导出，避免与 qq.ts 顶层同名 export 触发 nitro auto-import 冲突。
 * 调用方：`import { githubProvider } from '~~/server/utils/oauthProviders/github'`
 */
export const githubProvider: OauthProviderModule = {
  buildAuthorizeUrl(config: ProviderConfig, state: string): string {
    const url = new URL(AUTHORIZE_URL)
    url.searchParams.set('client_id', config.clientId)
    url.searchParams.set('redirect_uri', config.callbackUrl)
    url.searchParams.set('state', state)
    url.searchParams.set('scope', SCOPES.join(' '))
    url.searchParams.set('allow_signup', 'true')
    return url.toString()
  },

  async exchangeCode(config: ProviderConfig, code: string): Promise<TokenResult> {
    const body = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.callbackUrl
    })

    const response = await $fetch<{
      access_token?: string
      error?: string
      error_description?: string
    }>(TOKEN_URL, {
      method: 'POST',
      body,
      headers: { Accept: 'application/json' }
    })

    if (!response?.access_token) {
      throw createError({ statusCode: 502, message: response?.error_description || response?.error || 'github token exchange failed' })
    }

    return {
      accessToken: response.access_token
    }
  },

  async fetchUserInfo(_config: ProviderConfig, accessToken: string, _token: TokenResult): Promise<ProviderProfile> {
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'OpenAPI-Auth'
    }

    const profile = await $fetch<Record<string, unknown>>(USERINFO_URL, { headers })
    if (!profile || typeof profile !== 'object') {
      throw createError({ statusCode: 502, message: 'github userinfo fetch failed' })
    }

    let email = typeof profile.email === 'string' && profile.email ? profile.email : null
    if (!email) {
      try {
        const emails = await $fetch<Array<{ email: string, primary: boolean, verified: boolean }>>(EMAILS_URL, { headers })
        const primary = emails.find(item => item.primary && item.verified) || emails.find(item => item.verified) || emails[0]
        email = primary?.email || null
      } catch {
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
      avatarUrl: typeof profile.avatar_url === 'string' ? profile.avatar_url : null
    }
  }
}

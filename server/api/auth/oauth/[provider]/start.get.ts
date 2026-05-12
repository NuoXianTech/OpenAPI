import type { H3Event } from 'h3'
import { createError, getQuery, getRouterParam, sendRedirect } from 'h3'
import { buildCallbackUrl, oauthProviderService } from '~~/server/service/oauthProviderService'
import { siteSettingsService } from '~~/server/service/siteSettingsService'
import { issueState, type OauthFlowMode } from '~~/server/utils/oauthState'
import { githubProvider } from '~~/server/utils/oauthProviders/github'
import { qqProvider } from '~~/server/utils/oauthProviders/qq'
import type { ProviderConfig } from '~~/server/utils/oauthProviders/types'
import { isSupportedOauthProvider } from '~~/shared/types/oauth'
import { getAuthUser } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  const provider = (getRouterParam(event, 'provider') || '').toLowerCase()
  if (!provider || !isSupportedOauthProvider(provider)) {
    throw createError({ statusCode: 404, message: 'provider not supported' })
  }

  const settings = await siteSettingsService.getOrCreate()
  if (!settings.oauthLoginEnabled) {
    throw createError({ statusCode: 403, message: 'oauth login is disabled' })
  }

  const row = await oauthProviderService.getByProvider(provider)
  if (!row || !row.isEnabled || !row.clientId) {
    throw createError({ statusCode: 403, message: 'provider is disabled' })
  }

  const query = getQuery(event)
  const rawReturnTo = (query.returnTo || '/').toString()
  const returnTo = rawReturnTo.startsWith('/') && !rawReturnTo.startsWith('//') ? rawReturnTo : '/'

  const mode: OauthFlowMode = (query.mode || '').toString() === 'bind' ? 'bind' : 'login'

  // bind 模式必须已登录为普通用户
  if (mode === 'bind') {
    const authUser = await getAuthUser(event)
    if (!authUser || authUser.kind !== 'user') {
      throw createError({ statusCode: 401, message: '需要先登录普通用户账号才能绑定第三方' })
    }
  }

  const { state } = issueState(event, provider, returnTo, mode)

  const providerConfig: ProviderConfig = {
    clientId: row.clientId,
    clientSecret: '',
    callbackUrl: buildCallbackUrl(settings.siteUrl, provider)
  }

  const authorizeUrl = provider === 'github'
    ? githubProvider.buildAuthorizeUrl(providerConfig, state)
    : qqProvider.buildAuthorizeUrl(providerConfig, state)

  return sendRedirect(event, authorizeUrl, 302)
})

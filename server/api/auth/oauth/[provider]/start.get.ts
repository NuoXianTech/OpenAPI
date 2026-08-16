import { createError, getQuery, getRouterParam, sendRedirect } from 'h3'
import { buildCallbackUrl, oauthProviderService } from '~~/server/services/oauth-provider-service'
import { systemSettingsService } from '~~/server/services/system-settings-service'
import { issueState, type OauthFlowMode } from '~~/server/utils/oauth-state'
import { githubProvider } from '~~/server/utils/oauth-providers/github'
import { qqProvider } from '~~/server/utils/oauth-providers/qq'
import type { ProviderConfig } from '~~/server/utils/oauth-providers/types'
import { isSupportedOauthProvider } from '~~/server/utils/oauth-provider-id'
import { getAuthUser } from '~~/server/utils/auth'
import { normalizeLocalReturnTo } from '~~/server/utils/local-return-to'
import { readQueryOption, readQueryString } from '~~/server/utils/request-query'

const OAUTH_FLOW_MODES = ['login', 'bind'] as const

export default defineEventHandler(async (event) => {
  const provider = (getRouterParam(event, 'provider') || '').toLowerCase()
  if (!provider || !isSupportedOauthProvider(provider)) {
    throw createError({ statusCode: 404, message: 'provider not supported' })
  }

  const settings = await systemSettingsService.getSettings()

  const row = await oauthProviderService.getByProvider(provider)
  if (!row || !row.isEnabled || !row.clientId) {
    throw createError({ statusCode: 403, message: 'provider is disabled' })
  }

  const query = getQuery(event)
  const returnTo = normalizeLocalReturnTo(readQueryString(query.returnTo, '/'))

  const mode: OauthFlowMode = readQueryOption(query.mode, OAUTH_FLOW_MODES) ?? 'login'

  // bind 模式必须已登录，用户和管理员都可以绑定第三方账号。
  if (mode === 'bind') {
    const authUser = await getAuthUser(event)
    if (!authUser) {
      throw createError({ statusCode: 401, message: '需要先登录账号才能绑定第三方' })
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

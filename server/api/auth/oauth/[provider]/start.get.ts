import type { H3Event } from 'h3'
import { createError, getQuery, getRouterParam, sendRedirect } from 'h3'
import { buildCallbackUrl, oauthProviderService } from '~~/server/service/oauthProviderService'
import { siteSettingsService } from '~~/server/service/siteSettingsService'
import { issueState } from '~~/server/utils/oauthState'
import { buildAuthorizeUrl as buildGithubAuthorize } from '~~/server/utils/oauthProviders/github'
import { buildAuthorizeUrl as buildQqAuthorize } from '~~/server/utils/oauthProviders/qq'
import type { ProviderConfig } from '~~/server/utils/oauthProviders/types'
import { isSupportedOauthProvider } from '~~/shared/types/oauth'

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

  const { state } = issueState(event, provider, returnTo)

  const providerConfig: ProviderConfig = {
    clientId: row.clientId,
    clientSecret: '',
    callbackUrl: buildCallbackUrl(settings.siteUrl, provider),
  }

  const authorizeUrl = provider === 'github'
    ? buildGithubAuthorize(providerConfig, state)
    : buildQqAuthorize(providerConfig, state)

  return sendRedirect(event, authorizeUrl, 302)
})

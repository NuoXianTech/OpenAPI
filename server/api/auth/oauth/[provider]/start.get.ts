import type { H3Event } from 'h3'
import { createError, getQuery, getRouterParam, sendRedirect } from 'h3'
import { oauthProviderService } from '~~/server/service/oauthProviderService'
import { issueState } from '~~/server/utils/oauthState'
import { buildAuthorizeUrl as buildGithubAuthorize } from '~~/server/utils/oauthProviders/github'

export default defineEventHandler(async (event: H3Event) => {
  const provider = (getRouterParam(event, 'provider') || '').toLowerCase()
  if (!provider) {
    throw createError({ statusCode: 400, message: 'provider is required' })
  }

  const config = await oauthProviderService.getDecryptedByProvider(provider)
  if (!config) {
    throw createError({ statusCode: 404, message: 'provider not found' })
  }
  if (!config.isEnabled) {
    throw createError({ statusCode: 403, message: 'provider is disabled' })
  }

  const query = getQuery(event)
  const rawReturnTo = (query.returnTo || '/').toString()
  const returnTo = rawReturnTo.startsWith('/') && !rawReturnTo.startsWith('//') ? rawReturnTo : '/'

  const { state } = issueState(event, provider, returnTo)

  const providerConfig = {
    provider: config.provider,
    clientId: config.clientId,
    clientSecret: '',
    scopes: config.scopes || [],
    callbackUrl: config.callbackUrl,
    authorizeUrl: config.authorizeUrl,
    tokenUrl: config.tokenUrl,
    userInfoUrl: config.userInfoUrl,
  }

  let authorizeUrl: string
  switch (provider) {
    case 'github':
      authorizeUrl = buildGithubAuthorize(providerConfig, state)
      break
    default:
      throw createError({ statusCode: 501, message: `provider ${provider} is not implemented` })
  }

  return sendRedirect(event, authorizeUrl, 302)
})

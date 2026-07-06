// 解绑当前用户的第三方账号绑定
import type { H3Event } from 'h3'
import { createError, getRouterParam } from 'h3'
import { oauthAccountService } from '~~/server/services/oauth-account-service'
import { operationLogService } from '~~/server/services/operation-log-service'
import { requireAuth } from '~~/server/utils/auth'
import { isSupportedOauthProvider } from '~~/server/utils/oauth-provider-id'

export default defineEventHandler(async (event: H3Event) => {
  const authUser = await requireAuth(event)
  const provider = (getRouterParam(event, 'provider') || '').toLowerCase()
  if (!provider || !isSupportedOauthProvider(provider)) {
    throw createError({ statusCode: 404, message: 'provider not supported' })
  }

  const removed = await oauthAccountService.unbind(authUser.id, provider)
  if (!removed) {
    throw createError({ statusCode: 404, message: '当前账号未绑定该第三方' })
  }

  await operationLogService.addLog({
    userId: authUser.id,
    actor: authUser.username,
    action: 'user.oauth.unbind',
    resourceType: 'oauth-account',
    resourceId: String(removed.id),
    detail: { provider, providerUserId: removed.providerUserId }
  })

  return { provider, providerUserId: removed.providerUserId }
})

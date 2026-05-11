import type { H3Event } from 'h3'
import { createError, getHeader, getRequestIP, readBody } from 'h3'
import { requireAdmin } from '~~/server/utils/auth'
import { oauthProviderService, type OauthProviderPatch } from '~~/server/service/oauthProviderService'
import { operationLogService } from '~~/server/service/operationLogService'
import { isSupportedOauthProvider } from '~~/shared/types/oauth'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const body = await readBody(event) as Record<string, unknown>
  const provider = (body.provider || '').toString().trim().toLowerCase()
  if (!provider || !isSupportedOauthProvider(provider)) {
    throw createError({ statusCode: 400, message: 'provider 不合法，仅支持 github / qq' })
  }

  const patch: OauthProviderPatch = {}
  if (body.clientId !== undefined) patch.clientId = String(body.clientId)
  if (body.clientSecret !== undefined) patch.clientSecret = String(body.clientSecret)
  if (body.isEnabled !== undefined) patch.isEnabled = Boolean(body.isEnabled)

  const updated = await oauthProviderService.update(provider, patch)
  if (!updated) {
    throw createError({ statusCode: 500, message: 'update failed' })
  }

  await operationLogService.addLog({
    userId: admin.id || null,
    actor: admin.username,
    actorType: 'admin',
    action: 'admin.oauth-provider.update',
    resourceType: 'oauth_provider',
    resourceId: String(updated.id),
    ip: getRequestIP(event) || null,
    userAgent: getHeader(event, 'user-agent') || null,
    detail: { provider: updated.provider, changedFields: Object.keys(patch) },
  })

  return updated
})

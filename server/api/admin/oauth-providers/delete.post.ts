import type { H3Event } from 'h3'
import { createError, getHeader, getRequestIP, readBody } from 'h3'
import { requireAdmin } from '~~/server/utils/auth'
import { oauthProviderService } from '~~/server/service/oauthProviderService'
import { operationLogService } from '~~/server/service/operationLogService'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const body = await readBody(event) as Record<string, unknown>
  const id = Number(body.id)
  if (!id) {
    throw createError({ statusCode: 400, message: 'id is required' })
  }

  const deleted = await oauthProviderService.delete(id)
  if (!deleted) {
    throw createError({ statusCode: 404, message: 'provider not found' })
  }

  await operationLogService.addLog({
    userId: admin.id || null,
    actor: admin.username,
    actorType: 'admin',
    action: 'admin.oauth-provider.delete',
    resourceType: 'oauth_provider',
    resourceId: deleted.id,
    ip: getRequestIP(event) || null,
    userAgent: getHeader(event, 'user-agent') || null,
    detail: { provider: deleted.provider, displayName: deleted.displayName },
  })

  return { code: 0, msg: 'ok', data: deleted }
})

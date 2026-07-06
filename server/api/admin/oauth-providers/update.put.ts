import type { H3Event } from 'h3'
import { createError } from 'h3'
import { adminUpdateOauthProviderSchema } from '~~/server/schemas/admin'
import { requireAdmin } from '~~/server/utils/auth'
import { oauthProviderService, toAdminOauthProviderSafe, type OauthProviderPatch } from '~~/server/services/oauth-provider-service'
import { operationLogService } from '~~/server/services/operation-log-service'
import { isSupportedOauthProvider } from '~~/server/utils/oauth-provider-id'
import { readRequestMeta } from '~~/server/utils/request-meta'
import { readZodBody } from '~~/server/utils/zod'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const body = await readZodBody(event, adminUpdateOauthProviderSchema)
  const { provider } = body
  if (!isSupportedOauthProvider(provider)) {
    throw createError({ statusCode: 400, message: 'provider 不合法，仅支持 github / qq' })
  }

  const patch: OauthProviderPatch = {}
  if (body.clientId !== undefined) patch.clientId = body.clientId
  if (body.clientSecret !== undefined) patch.clientSecret = body.clientSecret
  if (body.isEnabled !== undefined) patch.isEnabled = body.isEnabled

  const updated = await oauthProviderService.update(provider, patch)
  if (!updated) {
    throw createError({ statusCode: 500, message: 'update failed' })
  }

  await operationLogService.addLog({
    userId: admin.id || null,
    actor: admin.username,
    action: 'admin.oauth-provider.update',
    resourceType: 'oauth-provider',
    resourceId: updated.provider,
    ...readRequestMeta(event),
    detail: { provider: updated.provider, changedFields: Object.keys(patch) }
  })

  return toAdminOauthProviderSafe(updated)
})

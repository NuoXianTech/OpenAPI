import type { H3Event } from 'h3'
import { createError, getHeader, getRequestIP, readBody } from 'h3'
import { requireAdmin } from '~~/server/utils/auth'
import { oauthProviderService, type OauthProviderInput } from '~~/server/service/oauthProviderService'
import { operationLogService } from '~~/server/service/operationLogService'

function readStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(item => String(item))
  }
  if (typeof value === 'string') {
    return value.split(',').map(item => item.trim()).filter(Boolean)
  }
  return []
}

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const body = await readBody(event) as Record<string, unknown>
  const id = Number(body.id)
  if (!id) {
    throw createError({ statusCode: 400, message: 'id is required' })
  }

  const patch: Partial<OauthProviderInput> = {}
  if (body.displayName !== undefined) patch.displayName = String(body.displayName).trim()
  if (body.icon !== undefined) patch.icon = body.icon ? String(body.icon).trim() : null
  if (body.clientId !== undefined) patch.clientId = String(body.clientId).trim()
  if (body.clientSecret !== undefined) patch.clientSecret = String(body.clientSecret)
  if (body.scopes !== undefined) patch.scopes = readStringArray(body.scopes)
  if (body.callbackUrl !== undefined) patch.callbackUrl = String(body.callbackUrl).trim()
  if (body.authorizeUrl !== undefined) patch.authorizeUrl = body.authorizeUrl ? String(body.authorizeUrl).trim() : null
  if (body.tokenUrl !== undefined) patch.tokenUrl = body.tokenUrl ? String(body.tokenUrl).trim() : null
  if (body.userInfoUrl !== undefined) patch.userInfoUrl = body.userInfoUrl ? String(body.userInfoUrl).trim() : null
  if (body.extraConfig !== undefined) {
    patch.extraConfig = typeof body.extraConfig === 'object' && body.extraConfig !== null ? body.extraConfig as Record<string, unknown> : null
  }
  if (body.isEnabled !== undefined) patch.isEnabled = Boolean(body.isEnabled)
  if (body.sortOrder !== undefined) patch.sortOrder = Number(body.sortOrder)
  if (body.description !== undefined) patch.description = body.description ? String(body.description) : null

  const updated = await oauthProviderService.update(id, patch)
  if (!updated) {
    throw createError({ statusCode: 404, message: 'provider not found' })
  }

  await operationLogService.addLog({
    userId: admin.id || null,
    actor: admin.username,
    actorType: 'admin',
    action: 'admin.oauth-provider.update',
    resourceType: 'oauth_provider',
    resourceId: updated.id,
    ip: getRequestIP(event) || null,
    userAgent: getHeader(event, 'user-agent') || null,
    detail: { provider: updated.provider, changedFields: Object.keys(patch) },
  })

  return { code: 0, msg: 'ok', data: updated }
})

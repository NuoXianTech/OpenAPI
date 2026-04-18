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

  const provider = (body.provider || '').toString().trim().toLowerCase()
  const displayName = (body.displayName || '').toString().trim()
  const clientId = (body.clientId || '').toString().trim()
  const clientSecret = (body.clientSecret || '').toString()
  const callbackUrl = (body.callbackUrl || '').toString().trim()

  if (!provider || !displayName || !clientId || !clientSecret || !callbackUrl) {
    throw createError({ statusCode: 400, message: 'provider, displayName, clientId, clientSecret, callbackUrl are required' })
  }

  const input: OauthProviderInput = {
    provider,
    displayName,
    icon: body.icon ? String(body.icon).trim() : null,
    clientId,
    clientSecret,
    scopes: readStringArray(body.scopes),
    callbackUrl,
    authorizeUrl: body.authorizeUrl ? String(body.authorizeUrl).trim() : null,
    tokenUrl: body.tokenUrl ? String(body.tokenUrl).trim() : null,
    userInfoUrl: body.userInfoUrl ? String(body.userInfoUrl).trim() : null,
    extraConfig: typeof body.extraConfig === 'object' && body.extraConfig !== null ? body.extraConfig as Record<string, unknown> : null,
    isEnabled: Boolean(body.isEnabled),
    sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : 0,
    description: body.description ? String(body.description) : null,
  }

  const created = await oauthProviderService.create(input)

  await operationLogService.addLog({
    userId: admin.id || null,
    actor: admin.username,
    actorType: 'admin',
    action: 'admin.oauth-provider.create',
    resourceType: 'oauth_provider',
    resourceId: created.id,
    ip: getRequestIP(event) || null,
    userAgent: getHeader(event, 'user-agent') || null,
    detail: { provider: created.provider, displayName: created.displayName },
  })

  return { code: 0, msg: 'ok', data: created }
})

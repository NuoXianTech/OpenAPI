import type { H3Event } from 'h3'
import { createError } from 'h3'
import { requireAdmin } from '~~/server/utils/auth'
import { siteSettingsService, type SiteSettingsUpsertInput } from '~~/server/service/siteSettingsService'
import { operationLogService } from '~~/server/service/operationLogService'

function parseOptionalInteger(value: unknown, field: string) {
  if (value === undefined) {
    return undefined
  }
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw createError({ statusCode: 400, message: `${field} must be a positive number` })
  }
  return Math.trunc(parsed)
}

function parseOptionalBoolean(value: unknown, field: string) {
  if (value === undefined) {
    return undefined
  }
  if (typeof value === 'boolean') {
    return value
  }
  if (value === 'true') {
    return true
  }
  if (value === 'false') {
    return false
  }
  throw createError({ statusCode: 400, message: `${field} must be a boolean` })
}

function parseOptionalString(value: unknown, field: string, maxLength: number) {
  if (value === undefined || value === null) {
    return undefined
  }
  const text = value.toString().trim()
  if (!text) {
    throw createError({ statusCode: 400, message: `${field} cannot be empty` })
  }
  if (text.length > maxLength) {
    throw createError({ statusCode: 400, message: `${field} is too long` })
  }
  return text
}

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const body = await readBody(event) as Record<string, unknown>

  const updateInput: SiteSettingsUpsertInput = {
    siteUrl: parseOptionalString(body.siteUrl, 'siteUrl', 1000),
    siteImg: parseOptionalString(body.siteImg, 'siteImg', 1000),
    siteName: parseOptionalString(body.siteName, 'siteName', 140),
    siteDescription: parseOptionalString(body.siteDescription, 'siteDescription', 5000),
    startTime: parseOptionalString(body.startTime, 'startTime', 32),
    sessionMaxAgeSeconds: parseOptionalInteger(body.sessionMaxAgeSeconds, 'sessionMaxAgeSeconds'),
    emailVerifyExpiresInMinutes: parseOptionalInteger(body.emailVerifyExpiresInMinutes, 'emailVerifyExpiresInMinutes'),
    smtpHost: parseOptionalString(body.smtpHost, 'smtpHost', 255),
    smtpPort: parseOptionalInteger(body.smtpPort, 'smtpPort'),
    smtpSecure: parseOptionalBoolean(body.smtpSecure, 'smtpSecure'),
    smtpUser: body.smtpUser !== undefined && body.smtpUser !== null ? body.smtpUser.toString().trim() : undefined,
    smtpPass: body.smtpPass !== undefined && body.smtpPass !== null ? body.smtpPass.toString() : undefined,
    smtpFrom: parseOptionalString(body.smtpFrom, 'smtpFrom', 255),
    oauthLoginEnabled: parseOptionalBoolean(body.oauthLoginEnabled, 'oauthLoginEnabled'),
    oauthForceBinding: parseOptionalBoolean(body.oauthForceBinding, 'oauthForceBinding'),
  }

  const entries = Object.entries(updateInput)
  const changedEntries = entries.filter(([, value]) => value !== undefined)
  if (changedEntries.length === 0) {
    throw createError({ statusCode: 400, message: 'at least one field is required' })
  }

  if (updateInput.smtpPort !== undefined && (updateInput.smtpPort < 1 || updateInput.smtpPort > 65535)) {
    throw createError({ statusCode: 400, message: 'smtpPort must be between 1 and 65535' })
  }

  if (updateInput.siteUrl && !/^https?:\/\//.test(updateInput.siteUrl)) {
    throw createError({ statusCode: 400, message: 'siteUrl must start with http:// or https://' })
  }

  const data = await siteSettingsService.update(updateInput)

  await operationLogService.addLog({
    userId: admin.id || null,
    actor: admin.username,
    action: 'admin.settings.update',
    resourceType: 'site-settings',
    resourceId: String(data.id),
    detail: { changedFields: changedEntries.map(([key]) => key) },
  })

  return {
    code: 0,
    msg: 'ok',
    data,
  }
})

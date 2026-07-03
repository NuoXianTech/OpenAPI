import type { H3Event } from 'h3'
import { createError } from 'h3'
import { adminUpdateUserApiKeySchema } from '#shared/schemas/admin'
import { apiKeyService } from '~~/server/services/api-key-service'
import { requireAdmin } from '~~/server/utils/auth'
import { operationLogService } from '~~/server/services/operation-log-service'
import { readZodBody } from '~~/server/utils/zod'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const input = await readZodBody(event, adminUpdateUserApiKeySchema)

  const updated = await apiKeyService.updateConfig(input.id, {
    name: input.name,
    expiresAt: input.expiresAt,
    totalQuota: input.totalQuota,
    scopes: input.scopes,
    ipWhitelist: input.ipWhitelist,
    isActive: input.isActive
  })

  if (!updated) {
    throw createError({ statusCode: 404, message: 'API Key 不存在' })
  }

  await operationLogService.addLog({
    userId: admin.id || null,
    actor: admin.username,
    action: 'admin.api-key.update',
    resourceType: 'api-key',
    resourceId: String(updated.id),
    detail: {
      patch: {
        name: input.name,
        expiresAt: input.expiresAt,
        totalQuota: input.totalQuota,
        scopes: input.scopes,
        ipWhitelist: input.ipWhitelist,
        isActive: input.isActive
      }
    }
  })

  return updated
})

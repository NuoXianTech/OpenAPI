import { createError } from 'h3'
import { adminUpdateUserApiKeySchema } from '~~/server/schemas/admin'
import { apiKeyService } from '~~/server/services/api-key-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { operationLogService } from '~~/server/services/operation-log-service'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
  const input = await readZodBody(event, adminUpdateUserApiKeySchema)
  const { id, ...patch } = input

  const updated = await apiKeyService.updateConfig(id, patch)

  if (!updated) {
    throw createError({ statusCode: 404, message: 'API Key 不存在' })
  }

  await operationLogService.addRequestLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.api-key.update',
    resourceType: 'api-key',
    resourceId: updated.id,
    detail: { patch }
  })

  return updated
})

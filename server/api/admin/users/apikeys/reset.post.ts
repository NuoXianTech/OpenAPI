import type { H3Event } from 'h3'
import { createError } from 'h3'
import { idSchema } from '~~/server/schemas/common'
import { apiKeyService } from '~~/server/services/api-key-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { operationLogService } from '~~/server/services/operation-log-service'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event: H3Event, admin) => {
  const { id } = await readZodBody(event, idSchema)

  const updated = await apiKeyService.resetById(id)
  if (!updated) {
    throw createError({ statusCode: 404, message: 'API Key 不存在' })
  }

  await operationLogService.addRequestLog(event, {
    userId: admin.id || null,
    actor: admin.username,
    action: 'admin.api-key.reset',
    resourceType: 'api-key',
    resourceId: String(id),
    detail: { keyId: updated.id }
  })

  return updated
})

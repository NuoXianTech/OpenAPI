import { createError } from 'h3'
import { userUpdateApiKeySchema } from '~~/server/schemas/user'
import { apiKeyService } from '~~/server/services/api-key-service'
import { operationLogService } from '~~/server/services/operation-log-service'
import { defineAuthenticatedEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineAuthenticatedEventHandler(async (event, user) => {
  const input = await readZodBody(event, userUpdateApiKeySchema)
  const { id, ...patch } = input
  const updated = await apiKeyService.updateConfig(id, patch, { userId: user.id })

  if (!updated) {
    throw createError({ statusCode: 404, message: 'API Key 不存在或无权访问' })
  }

  await operationLogService.addRequestLog(event, {
    userId: user.id,
    actor: user.username,
    action: 'user.api-key.update',
    resourceType: 'api-key',
    resourceId: String(updated.id),
    detail: { keyName: updated.name, patch }
  })

  return updated
})

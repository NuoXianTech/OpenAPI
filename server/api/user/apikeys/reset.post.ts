import { createError } from 'h3'
import { idSchema } from '~~/server/schemas/common'
import { apiKeyService } from '~~/server/services/api-key-service'
import { operationLogService } from '~~/server/services/operation-log-service'
import { defineAuthenticatedEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineAuthenticatedEventHandler(async (event, user) => {
  const { id } = await readZodBody(event, idSchema)

  const updated = await apiKeyService.resetForUser(user.id, id)
  if (!updated) {
    throw createError({ statusCode: 404, message: 'API Key 不存在' })
  }

  await operationLogService.addRequestLog(event, {
    userId: user.id,
    actor: user.username,
    action: 'user.api-key.reset',
    resourceType: 'api-key',
    resourceId: String(updated.id),
    detail: { keyName: updated.name }
  })

  return updated
})

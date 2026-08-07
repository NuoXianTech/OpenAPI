import { createError } from 'h3'
import { idSchema } from '~~/server/schemas/common'
import { apiKeyService } from '~~/server/services/api-key-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { defineAuthenticatedEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineAuthenticatedEventHandler(async (event, user) => {
  const { id } = await readZodBody(event, idSchema)

  const updated = await apiKeyService.resetForUser(user.id, id)
  if (!updated) {
    throw createError({ statusCode: 404, message: 'API Key 不存在' })
  }

  await addRequestOperationLog(event, {
    userId: user.id,
    actor: user.username,
    action: 'user.api-key.reset',
    resourceType: 'api-key',
    resourceId: updated.id,
    detail: { keyName: updated.name }
  })

  return updated
})

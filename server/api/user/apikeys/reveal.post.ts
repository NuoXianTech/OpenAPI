import { createError } from 'h3'
import { idSchema } from '~~/server/schemas/common'
import { apiKeyService } from '~~/server/services/api-key-service'
import { defineAuthenticatedEventHandler } from '~~/server/utils/auth'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { readZodBody } from '~~/server/utils/zod'

export default defineAuthenticatedEventHandler(async (event, user) => {
  const { id } = await readZodBody(event, idSchema)
  const revealed = await apiKeyService.revealForUser(user.id, id)

  if (!revealed) {
    throw createError({ statusCode: 404, message: 'API Key 不存在或无权访问' })
  }

  await addRequestOperationLog(event, {
    userId: user.id,
    actor: user.username,
    action: 'user.api-key.reveal',
    resourceType: 'api-key',
    resourceId: revealed.id,
    detail: { keyName: revealed.name }
  }, { required: true })

  return revealed
})

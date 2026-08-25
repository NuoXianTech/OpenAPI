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

  // `user.api-key.reveal` 是 gate 级审计：写入失败会抛错，明文不会在无痕的情况下交付。
  await addRequestOperationLog(event, {
    userId: user.id,
    actor: user.username,
    action: 'user.api-key.reveal',
    resourceType: 'api-key',
    resourceId: revealed.id,
    detail: { keyName: revealed.name }
  })

  return revealed
})

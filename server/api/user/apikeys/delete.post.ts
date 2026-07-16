import { createError } from 'h3'
import { idSchema } from '~~/server/schemas/common'
import { apiKeyService } from '~~/server/services/api-key-service'
import { defineAuthenticatedEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineAuthenticatedEventHandler(async (event, user) => {
  const { id } = await readZodBody(event, idSchema)

  const deleted = await apiKeyService.deleteForUser(user.id, id)
  if (!deleted) {
    throw createError({ statusCode: 404, message: 'API Key 不存在' })
  }

  return deleted
})

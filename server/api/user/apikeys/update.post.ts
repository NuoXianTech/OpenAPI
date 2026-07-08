import type { H3Event } from 'h3'
import { createError } from 'h3'
import { userUpdateApiKeySchema } from '~~/server/schemas/user'
import { apiKeyService } from '~~/server/services/api-key-service'
import { requireAuth } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineEventHandler(async (event: H3Event) => {
  const user = await requireAuth(event)
  const input = await readZodBody(event, userUpdateApiKeySchema)
  const { id, ...patch } = input
  const updated = await apiKeyService.updateConfig(id, patch, { userId: user.id })

  if (!updated) {
    throw createError({ statusCode: 404, message: 'API Key 不存在或无权访问' })
  }
  return updated
})

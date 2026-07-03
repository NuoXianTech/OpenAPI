import type { H3Event } from 'h3'
import { createError } from 'h3'
import { idSchema } from '#shared/schemas/common'
import { apiKeyService } from '~~/server/services/api-key-service'
import { requireAuth } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineEventHandler(async (event: H3Event) => {
  const user = await requireAuth(event)
  const { id } = await readZodBody(event, idSchema)

  const updated = await apiKeyService.resetForUser(user.id, id)
  if (!updated) {
    throw createError({ statusCode: 404, message: 'API Key 不存在' })
  }

  return updated
})

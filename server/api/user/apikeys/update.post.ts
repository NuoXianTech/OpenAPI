import type { H3Event } from 'h3'
import { createError } from 'h3'
import { userUpdateApiKeySchema } from '#shared/schemas/user'
import { apiKeyService } from '~~/server/service/apiKeyService'
import { requireAuth } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineEventHandler(async (event: H3Event) => {
  const user = await requireAuth(event)
  const input = await readZodBody(event, userUpdateApiKeySchema)
  const updated = await apiKeyService.updateConfig(
    input.id,
    {
      name: input.name,
      expiresAt: input.expiresAt,
      totalQuota: input.totalQuota,
      scopes: input.scopes,
      ipWhitelist: input.ipWhitelist,
      isActive: input.isActive
    },
    { userId: user.id }
  )

  if (!updated) {
    throw createError({ statusCode: 404, message: 'API Key 不存在或无权访问' })
  }
  return updated
})

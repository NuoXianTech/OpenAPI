import type { H3Event } from 'h3'
import { userCreateApiKeySchema } from '~~/server/schemas/user'
import { apiKeyService } from '~~/server/services/api-key-service'
import { requireAuth } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineEventHandler(async (event: H3Event) => {
  const user = await requireAuth(event)
  const input = await readZodBody(event, userCreateApiKeySchema)

  const created = await apiKeyService.createForUser(user.id, input)

  return { keys: created, count: created.length }
})

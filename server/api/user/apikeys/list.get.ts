import type { H3Event } from 'h3'
import { apiKeyService } from '~~/server/services/api-key-service'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  const user = await requireAuth(event)
  const list = await apiKeyService.listByUser(user.id)
  return list
})

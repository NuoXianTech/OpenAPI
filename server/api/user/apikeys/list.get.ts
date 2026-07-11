import type { H3Event } from 'h3'
import { apiKeyService } from '~~/server/services/api-key-service'
import { defineAuthenticatedEventHandler } from '~~/server/utils/auth'

export default defineAuthenticatedEventHandler(async (event: H3Event, user) => {
  const list = await apiKeyService.listByUser(user.id)
  return list
})

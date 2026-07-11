import type { H3Event } from 'h3'
import { apiKeyService } from '~~/server/services/api-key-service'
import { defineAuthenticatedEventHandler } from '~~/server/utils/auth'

export default defineAuthenticatedEventHandler((event: H3Event, user) => {
  return apiKeyService.listByUser(user.id)
})

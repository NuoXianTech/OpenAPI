import type { H3Event } from 'h3'
import { getQuery } from 'h3'
import { apiKeyService } from '~~/server/services/api-key-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readRequiredQueryNumber } from '~~/server/utils/request-query'

export default defineAdminEventHandler((event: H3Event) => {
  const userId = readRequiredQueryNumber(getQuery(event), 'userId')

  return apiKeyService.listByUser(userId)
})

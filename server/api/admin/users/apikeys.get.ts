import { getQuery } from 'h3'
import { apiKeyService } from '~~/server/services/api-key-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readRequiredQueryPositiveInteger } from '~~/server/utils/request-query'

export default defineAdminEventHandler((event) => {
  const userId = readRequiredQueryPositiveInteger(getQuery(event), 'userId')

  return apiKeyService.listByUser(userId)
})

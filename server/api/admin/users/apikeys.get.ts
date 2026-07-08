import type { H3Event } from 'h3'
import { getQuery } from 'h3'
import { apiKeyService } from '~~/server/services/api-key-service'
import { requireAdmin } from '~~/server/utils/auth'
import { readRequiredQueryNumber } from '~~/server/utils/request-query'

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  const userId = readRequiredQueryNumber(getQuery(event), 'userId')

  const list = await apiKeyService.listByUser(userId)
  return list
})

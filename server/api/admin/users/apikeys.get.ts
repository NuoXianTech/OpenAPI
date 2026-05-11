import type { H3Event } from 'h3'
import { createError, getQuery } from 'h3'
import { apiKeyService } from '~~/server/service/apiKeyService'
import { requireAdmin } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  const query = getQuery(event)
  const userId = Number(query.userId)
  if (!userId) {
    throw createError({ statusCode: 400, message: 'userId is required' })
  }

  const list = await apiKeyService.listByUser(userId)
  return list
})

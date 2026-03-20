import type { H3Event } from 'h3'
import { createError } from 'h3'
import { apiKeyService } from '~~/server/service/apiKeyService'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  const user = await requireAuth(event)
  if (!user.id) {
    throw createError({ statusCode: 403, message: 'admin cannot access user api keys' })
  }

  const list = await apiKeyService.listByUser(user.id)
  return {
    code: 0,
    msg: 'ok',
    data: list,
  }
})

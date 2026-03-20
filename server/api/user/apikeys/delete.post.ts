import type { H3Event } from 'h3'
import { createError } from 'h3'
import { apiKeyService } from '~~/server/service/apiKeyService'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  const user = await requireAuth(event)
  if (!user.id) {
    throw createError({ statusCode: 403, message: 'admin cannot access user api keys' })
  }

  const body = await readBody(event) as Record<string, any>
  const id = Number(body.id)
  if (!id) {
    throw createError({ statusCode: 400, message: 'id is required' })
  }

  const deleted = await apiKeyService.deleteForUser(user.id, id)
  if (!deleted) {
    throw createError({ statusCode: 404, message: 'api key not found' })
  }

  return {
    code: 0,
    msg: 'ok',
    data: deleted,
  }
})

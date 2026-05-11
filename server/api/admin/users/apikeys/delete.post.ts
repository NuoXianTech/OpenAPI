import type { H3Event } from 'h3'
import { createError } from 'h3'
import { apiKeyService } from '~~/server/service/apiKeyService'
import { requireAdmin } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  const body = await readBody(event) as Record<string, unknown>
  const id = Number(body.id)
  if (!id) {
    throw createError({ statusCode: 400, message: 'id is required' })
  }

  const deleted = await apiKeyService.deleteById(id)
  if (!deleted) {
    throw createError({ statusCode: 404, message: 'api key not found' })
  }

  return deleted
})

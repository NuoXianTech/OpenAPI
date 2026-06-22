import type { H3Event } from 'h3'
import { createError } from 'h3'
import { idSchema } from '#shared/schemas/common'
import { apiKeyService } from '~~/server/service/apiKeyService'
import { requireAdmin } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  const { id } = await readZodBody(event, idSchema)

  const deleted = await apiKeyService.deleteById(id)
  if (!deleted) {
    throw createError({ statusCode: 404, message: 'API Key 不存在' })
  }

  return deleted
})

import type { H3Event } from 'h3'
import { createError } from 'h3'
import { idSchema } from '#shared/schemas/common'
import { apiKeyService } from '~~/server/service/apiKeyService'
import { requireAuth } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineEventHandler(async (event: H3Event) => {
  const user = await requireAuth(event)
  if (!user.id) {
    throw createError({ statusCode: 403, message: '管理员不能访问用户 API Key' })
  }

  const { id } = await readZodBody(event, idSchema)

  const deleted = await apiKeyService.deleteForUser(user.id, id)
  if (!deleted) {
    throw createError({ statusCode: 404, message: 'API Key 不存在' })
  }

  return deleted
})

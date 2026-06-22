import type { H3Event } from 'h3'
import { createError } from 'h3'
import { idSchema } from '#shared/schemas/common'
import { apiKeyService } from '~~/server/service/apiKeyService'
import { requireAdmin } from '~~/server/utils/auth'
import { operationLogService } from '~~/server/service/operationLogService'
import { readZodBody } from '~~/server/utils/zod'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const { id } = await readZodBody(event, idSchema)

  const updated = await apiKeyService.resetById(id)
  if (!updated) {
    throw createError({ statusCode: 404, message: 'API Key 不存在' })
  }

  await operationLogService.addLog({
    userId: admin.id || null,
    actor: admin.username,
    action: 'admin.api-key.reset',
    resourceType: 'api-key',
    resourceId: String(id),
    detail: { updated }
  })

  return updated
})

import type { H3Event } from 'h3'
import { createError } from 'h3'
import { apiKeyService } from '~~/server/service/apiKeyService'
import { requireAdmin } from '~~/server/utils/auth'
import { operationLogService } from '~~/server/service/operationLogService'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const body = await readBody(event) as Record<string, any>
  const id = Number(body.id)
  if (!id) {
    throw createError({ statusCode: 400, message: 'id is required' })
  }

  const updated = await apiKeyService.resetById(id)
  if (!updated) {
    throw createError({ statusCode: 404, message: 'api key not found' })
  }

  await operationLogService.addLog({
    userId: admin.id || null,
    actor: admin.username,
    action: 'admin.apikey.reset',
    resourceType: 'apikey',
    resourceId: String(id),
    detail: JSON.stringify(updated),
  })

  return {
    code: 0,
    msg: 'ok',
    data: updated,
  }
})

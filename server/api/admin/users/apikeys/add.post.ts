import type { H3Event } from 'h3'
import { createError } from 'h3'
import { apiKeyService } from '~~/server/service/apiKeyService'
import { requireAdmin } from '~~/server/utils/auth'
import { operationLogService } from '~~/server/service/operationLogService'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const body = await readBody(event) as Record<string, any>
  const userId = Number(body.userId)
  if (!userId) {
    throw createError({ statusCode: 400, message: 'userId is required' })
  }

  const name = (body.name || '').toString().trim() || '默认密钥'
  const created = await apiKeyService.createForUser(userId, name)

  await operationLogService.addLog({
    userId: admin.id || null,
    actor: admin.username,
    action: 'admin.apikey.create',
    resourceType: 'apikey',
    resourceId: String(created.id),
    detail: { created },
  })

  return {
    code: 0,
    msg: 'ok',
    data: created,
  }
})

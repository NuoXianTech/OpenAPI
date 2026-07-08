import type { H3Event } from 'h3'
import { adminCreateUserApiKeySchema } from '~~/server/schemas/admin'
import { apiKeyService } from '~~/server/services/api-key-service'
import { requireAdmin } from '~~/server/utils/auth'
import { operationLogService } from '~~/server/services/operation-log-service'
import { readZodBody } from '~~/server/utils/zod'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const input = await readZodBody(event, adminCreateUserApiKeySchema)
  const { userId, ...payload } = input

  const created = await apiKeyService.createForUser(userId, payload)

  await operationLogService.addLog({
    userId: admin.id || null,
    actor: admin.username,
    action: 'admin.api-key.create',
    resourceType: 'api-key',
    resourceId: created.map(k => k.id).join(','),
    detail: { created, count: created.length }
  })

  return { keys: created, count: created.length }
})

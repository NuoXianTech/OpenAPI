import type { H3Event } from 'h3'
import { adminCreateUserApiKeySchema } from '#shared/schemas/admin'
import { apiKeyService } from '~~/server/service/apiKeyService'
import { requireAdmin } from '~~/server/utils/auth'
import { operationLogService } from '~~/server/service/operationLogService'
import { readZodBody } from '~~/server/utils/zod'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const input = await readZodBody(event, adminCreateUserApiKeySchema)

  const created = await apiKeyService.createForUser(input.userId, {
    name: input.name || '默认密钥',
    expiresAt: input.expiresAt ?? null,
    totalQuota: input.totalQuota ?? null,
    scopes: input.scopes ?? null,
    ipWhitelist: input.ipWhitelist ?? null,
    count: input.count
  })

  await operationLogService.addLog({
    userId: admin.id || null,
    actor: admin.username,
    action: 'admin.apikey.create',
    resourceType: 'apikey',
    resourceId: created.map(k => k.id).join(','),
    detail: { created, count: created.length }
  })

  return { keys: created, count: created.length }
})

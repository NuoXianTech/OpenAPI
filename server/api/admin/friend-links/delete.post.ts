import type { H3Event } from 'h3'
import { createError } from 'h3'
import { idSchema } from '~~/server/schemas/common'
import { friendLinkService } from '~~/server/services/friend-link-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { operationLogService } from '~~/server/services/operation-log-service'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event: H3Event, admin) => {
  const { id } = await readZodBody(event, idSchema)

  const deleted = await friendLinkService.delete(id)
  if (!deleted) {
    throw createError({ statusCode: 404, message: 'friend link not found' })
  }

  await operationLogService.addRequestLog(event, {
    userId: admin.id || null,
    actor: admin.username,
    action: 'admin.friend-link.delete',
    resourceType: 'friend-link',
    resourceId: String(id),
    detail: { deleted }
  })

  return deleted
})

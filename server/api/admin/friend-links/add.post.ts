import type { H3Event } from 'h3'
import { adminCreateFriendLinkSchema } from '#shared/schemas/admin'
import { friendLinkService } from '~~/server/services/friend-link-service'
import { requireAdmin } from '~~/server/utils/auth'
import { operationLogService } from '~~/server/services/operation-log-service'
import { readZodBody } from '~~/server/utils/zod'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const body = await readZodBody(event, adminCreateFriendLinkSchema)

  const created = await friendLinkService.create({
    title: body.title,
    url: body.url,
    description: body.description?.trim() || null,
    isActive: body.isActive ?? true,
    createdBy: admin.id || null
  })

  await operationLogService.addLog({
    userId: admin.id || null,
    actor: admin.username,
    action: 'admin.friend-link.create',
    resourceType: 'friend-link',
    resourceId: String(created.id),
    detail: { created }
  })

  return created
})

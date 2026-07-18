import { adminCreateFriendLinkSchema } from '~~/server/schemas/admin'
import { friendLinkService } from '~~/server/services/friend-link-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { operationLogService } from '~~/server/services/operation-log-service'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
  const body = await readZodBody(event, adminCreateFriendLinkSchema)

  const created = await friendLinkService.create({
    title: body.title,
    url: body.url,
    description: body.description?.trim() || null,
    isActive: body.isActive ?? true,
    createdBy: admin.id
  })

  await operationLogService.addRequestLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.friend-link.create',
    resourceType: 'friend-link',
    resourceId: created.id,
    detail: { created }
  })

  return created
})

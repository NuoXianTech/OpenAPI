import { createError } from 'h3'
import { idSchema } from '~~/server/schemas/common'
import { announcementService } from '~~/server/services/announcement-service'
import { operationLogService } from '~~/server/services/operation-log-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readRequestMeta } from '~~/server/utils/request-meta'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
  const { id } = await readZodBody(event, idSchema)

  const removed = await announcementService.softDelete(id)
  if (!removed) {
    throw createError({ statusCode: 404, message: 'announcement not found' })
  }

  await operationLogService.addRequestLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.announcement.delete',
    resourceType: 'announcement',
    resourceId: id,
    ...readRequestMeta(event),
    detail: { title: removed.title }
  })

  return removed
})

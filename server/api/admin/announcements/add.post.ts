import { adminCreateAnnouncementSchema } from '~~/server/schemas/admin'
import { announcementService } from '~~/server/services/announcement-service'
import { operationLogService } from '~~/server/services/operation-log-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
  const body = await readZodBody(event, adminCreateAnnouncementSchema)

  const created = await announcementService.create({
    title: body.title,
    content: body.content,
    level: body.level ?? 'info',
    isPinned: body.isPinned ?? false,
    isEnabled: body.isEnabled ?? true,
    linkUrl: body.linkUrl?.trim() || null,
    sortOrder: body.sortOrder ?? 0
  }, admin.id)

  await operationLogService.addRequestLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.announcement.create',
    resourceType: 'announcement',
    resourceId: created?.id,
    detail: { title: body.title, level: body.level ?? 'info' }
  })

  return created
})

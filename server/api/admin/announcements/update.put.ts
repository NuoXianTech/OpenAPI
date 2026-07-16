import { createError } from 'h3'
import { adminUpdateAnnouncementSchema } from '~~/server/schemas/admin'
import { announcementService, type AnnouncementInput } from '~~/server/services/announcement-service'
import { operationLogService } from '~~/server/services/operation-log-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readRequestMeta } from '~~/server/utils/request-meta'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
  const body = await readZodBody(event, adminUpdateAnnouncementSchema)
  const { id } = body

  const patch: Partial<AnnouncementInput> = {}
  if (body.title !== undefined) patch.title = body.title
  if (body.content !== undefined) patch.content = body.content
  if (body.level !== undefined) patch.level = body.level
  if (body.isPinned !== undefined) patch.isPinned = body.isPinned
  if (body.isEnabled !== undefined) patch.isEnabled = body.isEnabled
  if (body.linkUrl !== undefined) patch.linkUrl = body.linkUrl?.trim() || null
  if (body.sortOrder !== undefined) patch.sortOrder = body.sortOrder

  const updated = await announcementService.update(id, patch, admin.id || null)
  if (!updated) {
    throw createError({ statusCode: 404, message: 'announcement not found' })
  }

  await operationLogService.addRequestLog(event, {
    actor: admin.username,
    action: 'admin.announcement.update',
    resourceType: 'announcement',
    resourceId: id,
    ...readRequestMeta(event),
    detail: { patch }
  })

  return updated
})

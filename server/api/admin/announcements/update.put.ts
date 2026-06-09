import type { H3Event } from 'h3'
import { createError, getHeader, getRequestIP } from 'h3'
import { adminUpdateAnnouncementSchema } from '#shared/schemas/admin'
import { announcementService, type AnnouncementInput } from '~~/server/service/announcementService'
import { operationLogService } from '~~/server/service/operationLogService'
import { requireAdmin } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
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

  await operationLogService.addLog({
    actor: admin.username,
    action: 'admin.announcement.update',
    resourceType: 'announcement',
    resourceId: id,
    ip: getRequestIP(event) || null,
    userAgent: getHeader(event, 'user-agent') || null,
    detail: { patch }
  })

  return updated
})

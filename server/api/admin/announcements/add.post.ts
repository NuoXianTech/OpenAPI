import type { H3Event } from 'h3'
import { adminCreateAnnouncementSchema } from '~~/server/schemas/admin'
import { announcementService } from '~~/server/services/announcement-service'
import { operationLogService } from '~~/server/services/operation-log-service'
import { requireAdmin } from '~~/server/utils/auth'
import { readRequestMeta } from '~~/server/utils/request-meta'
import { readZodBody } from '~~/server/utils/zod'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const body = await readZodBody(event, adminCreateAnnouncementSchema)

  const created = await announcementService.create({
    title: body.title,
    content: body.content,
    level: body.level ?? 'info',
    isPinned: body.isPinned ?? false,
    isEnabled: body.isEnabled ?? true,
    linkUrl: body.linkUrl?.trim() || null,
    sortOrder: body.sortOrder ?? 0
  }, admin.id || null)

  await operationLogService.addLog({
    actor: admin.username,
    action: 'admin.announcement.create',
    resourceType: 'announcement',
    resourceId: created?.id,
    ...readRequestMeta(event),
    detail: { title: body.title, level: body.level ?? 'info' }
  })

  return created
})

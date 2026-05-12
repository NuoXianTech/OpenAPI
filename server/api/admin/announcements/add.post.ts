import type { H3Event } from 'h3'
import { getHeader, getRequestIP } from 'h3'
import { adminCreateAnnouncementSchema } from '#shared/schemas/admin'
import { announcementService } from '~~/server/service/announcementService'
import { operationLogService } from '~~/server/service/operationLogService'
import { requireAdmin } from '~~/server/utils/auth'
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
    startAt: body.startAt ?? null,
    endAt: body.endAt ?? null,
    linkUrl: body.linkUrl?.trim() || null,
    sortOrder: body.sortOrder ?? 0,
  }, admin.id || null)

  await operationLogService.addLog({
    actor: admin.username,
    action: 'admin.announcement.create',
    resourceType: 'announcement',
    resourceId: created?.id,
    ip: getRequestIP(event) || null,
    userAgent: getHeader(event, 'user-agent') || null,
    detail: { title: body.title, level: body.level ?? 'info' },
  })

  return created
})

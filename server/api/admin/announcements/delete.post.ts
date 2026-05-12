import type { H3Event } from 'h3'
import { createError, getHeader, getRequestIP } from 'h3'
import { idSchema } from '#shared/schemas/common'
import { announcementService } from '~~/server/service/announcementService'
import { operationLogService } from '~~/server/service/operationLogService'
import { requireAdmin } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const { id } = await readZodBody(event, idSchema)

  const removed = await announcementService.softDelete(id)
  if (!removed) {
    throw createError({ statusCode: 404, message: 'announcement not found' })
  }

  await operationLogService.addLog({
    actor: admin.username,
    action: 'admin.announcement.delete',
    resourceType: 'announcement',
    resourceId: id,
    ip: getRequestIP(event) || null,
    userAgent: getHeader(event, 'user-agent') || null,
    detail: { title: removed.title }
  })

  return removed
})

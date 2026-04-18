import type { H3Event } from 'h3'
import { createError, getHeader, getRequestIP, readBody } from 'h3'
import { announcementService } from '~~/server/service/announcementService'
import { operationLogService } from '~~/server/service/operationLogService'
import { requireAdmin } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const body = await readBody(event) as Record<string, any>
  const id = Number(body.id)
  if (!id) {
    throw createError({ statusCode: 400, message: 'id is required' })
  }

  const removed = await announcementService.softDelete(id)
  if (!removed) {
    throw createError({ statusCode: 404, message: 'announcement not found' })
  }

  await operationLogService.addLog({
    actor: admin.username,
    actorType: 'admin',
    action: 'admin.announcement.delete',
    resourceType: 'announcement',
    resourceId: id,
    ip: getRequestIP(event) || null,
    userAgent: getHeader(event, 'user-agent') || null,
    detail: { title: removed.title },
  })

  return { code: 0, msg: 'ok', data: removed }
})

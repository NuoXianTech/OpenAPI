import type { H3Event } from 'h3'
import { createError, getHeader, getRequestIP, readBody } from 'h3'
import { announcementService, type AnnouncementInput } from '~~/server/service/announcementService'
import { operationLogService } from '~~/server/service/operationLogService'
import { requireAdmin } from '~~/server/utils/auth'

const VALID_LEVELS = ['info', 'success', 'warning', 'critical'] as const

function parseDate(value: unknown): Date | null {
  if (!value) return null
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date
}

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const body = await readBody(event) as Record<string, any>
  const id = Number(body.id)
  if (!id) {
    throw createError({ statusCode: 400, message: 'id is required' })
  }

  const patch: Partial<AnnouncementInput> = {}
  if (body.title !== undefined) patch.title = body.title.toString().trim()
  if (body.content !== undefined) patch.content = body.content.toString()
  if (body.level !== undefined) {
    const level = body.level.toString()
    patch.level = (VALID_LEVELS as readonly string[]).includes(level) ? level as typeof VALID_LEVELS[number] : 'info'
  }
  if (body.isPinned !== undefined) patch.isPinned = Boolean(body.isPinned)
  if (body.isEnabled !== undefined) patch.isEnabled = Boolean(body.isEnabled)
  if (body.startAt !== undefined) patch.startAt = parseDate(body.startAt)
  if (body.endAt !== undefined) patch.endAt = parseDate(body.endAt)
  if (body.linkUrl !== undefined) patch.linkUrl = body.linkUrl?.toString().trim() || null
  if (body.sortOrder !== undefined) patch.sortOrder = Number(body.sortOrder)

  const updated = await announcementService.update(id, patch, admin.id || null)
  if (!updated) {
    throw createError({ statusCode: 404, message: 'announcement not found' })
  }

  await operationLogService.addLog({
    actor: admin.username,
    actorType: 'admin',
    action: 'admin.announcement.update',
    resourceType: 'announcement',
    resourceId: id,
    ip: getRequestIP(event) || null,
    userAgent: getHeader(event, 'user-agent') || null,
    detail: { patch },
  })

  return { code: 0, msg: 'ok', data: updated }
})

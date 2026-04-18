import type { H3Event } from 'h3'
import { createError, getHeader, getRequestIP, readBody } from 'h3'
import { announcementService } from '~~/server/service/announcementService'
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

  const title = (body.title || '').toString().trim()
  const content = (body.content || '').toString()
  if (!title || !content) {
    throw createError({ statusCode: 400, message: 'title and content are required' })
  }

  const levelRaw = (body.level || 'info').toString()
  const level = (VALID_LEVELS as readonly string[]).includes(levelRaw) ? levelRaw as typeof VALID_LEVELS[number] : 'info'

  const created = await announcementService.create({
    title,
    content,
    level,
    isPinned: Boolean(body.isPinned),
    isEnabled: body.isEnabled !== undefined ? Boolean(body.isEnabled) : true,
    startAt: parseDate(body.startAt),
    endAt: parseDate(body.endAt),
    linkUrl: body.linkUrl?.toString().trim() || null,
    sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : 0,
  }, admin.id || null)

  await operationLogService.addLog({
    actor: admin.username,
    actorType: 'admin',
    action: 'admin.announcement.create',
    resourceType: 'announcement',
    resourceId: created?.id,
    ip: getRequestIP(event) || null,
    userAgent: getHeader(event, 'user-agent') || null,
    detail: { title, level },
  })

  return { code: 0, msg: 'ok', data: created }
})

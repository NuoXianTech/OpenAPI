import type { H3Event } from 'h3'
import { createError } from 'h3'
import { friendLinkService } from '~~/server/service/friendLinkService'
import { requireAdmin } from '~~/server/utils/auth'
import { operationLogService } from '~~/server/service/operationLogService'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const body = await readBody(event) as Record<string, any>
  const title = (body.title || '').toString().trim()
  const url = (body.url || '').toString().trim()

  if (!title || !url) {
    throw createError({ statusCode: 400, message: 'title and url are required' })
  }

  const created = await friendLinkService.create({
    title,
    url,
    description: (body.description || '').toString().trim() || null,
    isActive: Boolean(body.isActive),
    createdBy: admin.id || null,
  })

  await operationLogService.addLog({
    userId: admin.id || null,
    actor: admin.username,
    action: 'admin.friend-link.create',
    resourceType: 'friend-link',
    resourceId: String(created.id),
    detail: { created },
  })

  return { code: 0, msg: 'ok', data: created }
})

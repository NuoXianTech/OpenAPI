import type { H3Event } from 'h3'
import { createError } from 'h3'
import { friendLinkService } from '~~/server/service/friendLinkService'
import { requireAdmin } from '~~/server/utils/auth'
import { operationLogService } from '~~/server/service/operationLogService'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const body = await readBody(event) as Record<string, unknown>
  const title = String(body.title ?? '').trim()
  const url = String(body.url ?? '').trim()

  if (!title || !url) {
    throw createError({ statusCode: 400, message: 'title and url are required' })
  }

  const created = await friendLinkService.create({
    title,
    url,
    description: String(body.description ?? '').trim() || null,
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

  return created
})

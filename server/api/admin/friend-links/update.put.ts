import type { H3Event } from 'h3'
import { createError } from 'h3'
import { friendLinkService } from '~~/server/service/friendLinkService'
import { requireAdmin } from '~~/server/utils/auth'
import { operationLogService } from '~~/server/service/operationLogService'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const body = await readBody(event) as Record<string, unknown>
  const id = Number(body.id)
  if (!id) {
    throw createError({ statusCode: 400, message: 'id is required' })
  }

  const updated = await friendLinkService.update(id, {
    title: body.title !== undefined ? String(body.title).trim() : undefined,
    url: body.url !== undefined ? String(body.url).trim() : undefined,
    description: String(body.description ?? '').trim() || null,
    isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
  })

  await operationLogService.addLog({
    userId: admin.id || null,
    actor: admin.username,
    action: 'admin.friend-link.update',
    resourceType: 'friend-link',
    resourceId: String(id),
    detail: { updated },
  })

  return updated
})

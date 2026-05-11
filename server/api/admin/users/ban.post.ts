import type { H3Event } from 'h3'
import { createError, getHeader, getRequestIP } from 'h3'
import { usersService } from '~~/server/service/userService'
import { requireAdmin } from '~~/server/utils/auth'
import { operationLogService } from '~~/server/service/operationLogService'
import { sessionService } from '~~/server/service/sessionService'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const body = await readBody(event) as Record<string, unknown>
  const id = Number(body.id)
  if (!id) {
    throw createError({ statusCode: 400, message: 'id is required' })
  }

  const isBanned = Boolean(body.isBanned)
  const updated = await usersService.banUser(id, isBanned)

  if (isBanned) {
    await sessionService.deleteSessionsByUserId(id)
  }

  await operationLogService.addLog({
    actor: admin.username,
    actorType: 'admin',
    action: isBanned ? 'admin.user.ban' : 'admin.user.unban',
    resourceType: 'user',
    resourceId: id,
    ip: getRequestIP(event) || null,
    userAgent: getHeader(event, 'user-agent') || null,
    detail: { isBanned, username: updated?.username },
  })

  return updated
})

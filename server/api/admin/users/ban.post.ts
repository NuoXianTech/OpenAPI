import type { H3Event } from 'h3'
import { getHeader, getRequestIP } from 'h3'
import { adminBanUserSchema } from '#shared/schemas/admin'
import { usersService } from '~~/server/service/userService'
import { requireAdmin } from '~~/server/utils/auth'
import { operationLogService } from '~~/server/service/operationLogService'
import { sessionService } from '~~/server/service/sessionService'
import { readZodBody } from '~~/server/utils/zod'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const { id, isBanned } = await readZodBody(event, adminBanUserSchema)

  const updated = await usersService.banUser(id, isBanned)

  if (isBanned) {
    await sessionService.deleteSessionsByUserId(id)
  }

  await operationLogService.addLog({
    actor: admin.username,
    action: isBanned ? 'admin.user.ban' : 'admin.user.unban',
    resourceType: 'user',
    resourceId: id,
    ip: getRequestIP(event) || null,
    userAgent: getHeader(event, 'user-agent') || null,
    detail: { isBanned, username: updated?.username }
  })

  return updated
})

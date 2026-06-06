import type { H3Event } from 'h3'
import { createError, getHeader, getRequestIP } from 'h3'
import { adminUpdateUserSchema } from '#shared/schemas/admin'
import { usersService } from '~~/server/service/userService'
import { requireAdmin } from '~~/server/utils/auth'
import { operationLogService } from '~~/server/service/operationLogService'
import { readZodBody } from '~~/server/utils/zod'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const { id, username, email, displayName, isActive, isBanned } = await readZodBody(event, adminUpdateUserSchema)

  const updated = await usersService.updateUser(id, {
    username,
    email,
    displayName: displayName !== undefined ? (displayName || null) : undefined,
    isActive,
    isBanned
  })
  if (!updated) {
    throw createError({ statusCode: 404, message: 'user not found' })
  }

  await operationLogService.addLog({
    actor: admin.username,
    action: 'admin.user.update',
    resourceType: 'user',
    resourceId: id,
    ip: getRequestIP(event) || null,
    userAgent: getHeader(event, 'user-agent') || null,
    detail: { patch: { username, email, displayName, isActive, isBanned } }
  })

  const { passwordHash: _ph, ...safe } = updated
  return safe
})

import type { H3Event } from 'h3'
import { createError } from 'h3'
import { usersService } from '~~/server/service/userService'
import { requireAdmin } from '~~/server/utils/auth'
import { operationLogService } from '~~/server/service/operationLogService'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const body = await readBody(event) as Record<string, any>
  const id = Number(body.id)
  if (!id) {
    throw createError({ statusCode: 400, message: 'id is required' })
  }

  const updated = await usersService.updateUser(id, {
    username: body.username?.toString().trim(),
    email: body.email?.toString().trim().toLowerCase(),
    displayName: body.displayName?.toString().trim() || null,
    avatarUrl: body.avatarUrl?.toString().trim() || null,
    role: body.role?.toString().trim(),
    isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
    isBanned: typeof body.isBanned === 'boolean' ? body.isBanned : undefined,
  })

  await operationLogService.addLog({
    userId: admin.id || null,
    actor: admin.username,
    action: 'admin.user.update',
    resourceType: 'user',
    resourceId: String(id),
    detail: JSON.stringify(updated),
  })

  return {
    code: 0,
    msg: 'ok',
    data: updated,
  }
})

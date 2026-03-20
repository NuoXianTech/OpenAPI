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

  const deleted = await usersService.deleteUser(id)
  if (!deleted) {
    throw createError({ statusCode: 404, message: 'user not found' })
  }

  await operationLogService.addLog({
    userId: admin.id || null,
    actor: admin.username,
    action: 'admin.user.delete',
    resourceType: 'user',
    resourceId: String(id),
    detail: JSON.stringify(deleted),
  })

  return {
    code: 0,
    msg: 'ok',
    data: deleted,
  }
})

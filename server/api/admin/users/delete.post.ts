import type { H3Event } from 'h3'
import { createError } from 'h3'
import { idSchema } from '#shared/schemas/common'
import { usersService } from '~~/server/services/user-service'
import { requireAdmin } from '~~/server/utils/auth'
import { operationLogService } from '~~/server/services/operation-log-service'
import { readZodBody } from '~~/server/utils/zod'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const { id } = await readZodBody(event, idSchema)

  const deleted = await usersService.deleteUser(id)
  if (!deleted) {
    throw createError({ statusCode: 404, message: 'user not found' })
  }

  // passwordHash / tokenVersion 是敏感字段，不能进审计日志、也不应回给前端
  const { passwordHash: _ph, tokenVersion: _tv, ...safe } = deleted

  await operationLogService.addLog({
    userId: admin.id || null,
    actor: admin.username,
    action: 'admin.user.delete',
    resourceType: 'user',
    resourceId: String(id),
    detail: { username: safe.username, email: safe.email }
  })

  return safe
})

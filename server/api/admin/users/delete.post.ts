import type { H3Event } from 'h3'
import { createError } from 'h3'
import { idSchema } from '#shared/schemas/common'
import { usersService } from '~~/server/service/userService'
import { requireAdmin } from '~~/server/utils/auth'
import { operationLogService } from '~~/server/service/operationLogService'
import { readZodBody } from '~~/server/utils/zod'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const { id } = await readZodBody(event, idSchema)

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
    detail: { deleted }
  })

  return deleted
})

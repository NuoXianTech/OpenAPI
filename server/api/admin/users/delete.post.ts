import { createError } from 'h3'
import { idSchema } from '~~/server/schemas/common'
import { usersService } from '~~/server/services/user-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { operationLogService } from '~~/server/services/operation-log-service'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
  const { id } = await readZodBody(event, idSchema)

  if (admin.id === id) {
    throw createError({ statusCode: 400, message: '不能删除当前登录管理员' })
  }
  const target = await usersService.getById(id)
  if (!target) {
    throw createError({ statusCode: 404, message: 'user not found' })
  }
  if (await usersService.isOnlyAvailableAdmin(target)) {
    throw createError({ statusCode: 400, message: '至少需要保留一个管理员账号' })
  }

  const deleted = await usersService.deleteUser(id)
  if (!deleted) {
    throw createError({ statusCode: 404, message: 'user not found' })
  }

  // passwordHash / tokenVersion 是敏感字段，不能进审计日志、也不应回给前端
  const { passwordHash: _ph, tokenVersion: _tv, ...safe } = deleted

  await operationLogService.addRequestLog(event, {
    userId: admin.id || null,
    actor: admin.username,
    action: 'admin.user.delete',
    resourceType: 'user',
    resourceId: id,
    detail: { username: safe.username, email: safe.email }
  })

  return safe
})

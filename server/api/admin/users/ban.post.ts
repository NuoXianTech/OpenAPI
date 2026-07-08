import type { H3Event } from 'h3'
import { createError } from 'h3'
import { adminBanUserSchema } from '~~/server/schemas/admin'
import { usersService, USER_ROLES } from '~~/server/services/user-service'
import { requireAdmin } from '~~/server/utils/auth'
import { operationLogService } from '~~/server/services/operation-log-service'
import { readRequestMeta } from '~~/server/utils/request-meta'
import { readZodBody } from '~~/server/utils/zod'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const { id, isBanned, reason, bannedUntil } = await readZodBody(event, adminBanUserSchema)
  const target = await usersService.getById(id)
  if (!target) {
    throw createError({ statusCode: 404, message: 'user not found' })
  }
  if (isBanned && admin.id === id) {
    throw createError({ statusCode: 400, message: '不能封禁当前登录管理员' })
  }
  if (isBanned && target.role === USER_ROLES.admin && target.isActive && !target.isBanned && await usersService.countAvailableAdmins() <= 1) {
    throw createError({ statusCode: 400, message: '至少需要保留一个管理员账号' })
  }

  const updated = await usersService.banUser(id, isBanned, { reason, bannedUntil })

  // 封禁立即生效由 getAuthUser 的 isBanned 检查保证（每次鉴权都查 users 表），无需额外撤销操作。
  await operationLogService.addLog({
    userId: admin.id,
    actor: admin.username,
    action: isBanned ? 'admin.user.ban' : 'admin.user.unban',
    resourceType: 'user',
    resourceId: id,
    ...readRequestMeta(event),
    detail: {
      isBanned,
      username: updated?.username,
      reason: isBanned ? (reason?.trim() || null) : undefined,
      bannedUntil: isBanned ? (bannedUntil ? bannedUntil.toISOString() : null) : undefined
    }
  })

  return updated
})

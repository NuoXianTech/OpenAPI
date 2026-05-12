// 已登录用户修改密码：校验旧密码 → 设新密码 → 强制其他会话下线（保留当前会话）
import type { H3Event } from 'h3'
import { createError, getCookie } from 'h3'
import { userChangePasswordSchema } from '#shared/schemas/user'
import { usersService } from '~~/server/service/userService'
import { sessionService } from '~~/server/service/sessionService'
import { hashPassword, verifyPassword, requireAuth } from '~~/server/utils/auth'
import { operationLogService } from '~~/server/service/operationLogService'
import { readZodBody } from '~~/server/utils/zod'

const COOKIE_NAME = 'app_session'

export default defineEventHandler(async (event: H3Event) => {
  const authUser = await requireAuth(event)
  const { currentPassword, newPassword } = await readZodBody(event, userChangePasswordSchema)

  // 拉数据库行（不能用 authUser，里面没有 passwordHash）
  const userRow = await usersService.getById(authUser.id)
  if (!userRow) {
    throw createError({ statusCode: 404, message: '用户不存在' })
  }

  const ok = await verifyPassword(userRow.passwordHash, currentPassword)
  if (!ok) {
    throw createError({ statusCode: 400, message: '当前密码不正确' })
  }

  const newHash = await hashPassword(newPassword)
  await usersService.updatePasswordHash(authUser.id, newHash)

  // 保留当前会话，下线其他设备
  const sessionId = getCookie(event, COOKIE_NAME)
  if (sessionId) {
    await sessionService.deleteOtherSessionsForUser(authUser.id, sessionId)
  }
  else {
    await sessionService.deleteSessionsByUserId(authUser.id)
  }

  await operationLogService.addLog({
    userId: authUser.id,
    actor: authUser.username,
    action: 'user.password.change',
    resourceType: 'user',
    resourceId: String(authUser.id),
  })

  return null
})

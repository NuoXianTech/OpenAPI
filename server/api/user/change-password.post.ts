// 已登录用户修改密码：校验旧密码 → 设新密码 → 强制其他会话下线（保留当前会话）
import type { H3Event } from 'h3'
import { createError, getCookie, readBody } from 'h3'
import { usersService } from '~~/server/service/userService'
import { sessionService } from '~~/server/service/sessionService'
import { hashPassword, verifyPassword, requireAuth } from '~~/server/utils/auth'

import { operationLogService } from '~~/server/service/operationLogService'

const MIN_PASSWORD_LENGTH = 8
const COOKIE_NAME = 'app_session'

export default defineEventHandler(async (event: H3Event) => {
  const authUser = await requireAuth(event)

  const body = await readBody(event) as Record<string, any>
  const currentPassword = (body.currentPassword || '').toString()
  const newPassword = (body.newPassword || '').toString()

  if (!currentPassword || !newPassword) {
    throw createError({ statusCode: 400, message: '当前密码和新密码均必填' })
  }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    throw createError({ statusCode: 400, message: `新密码至少 ${MIN_PASSWORD_LENGTH} 位` })
  }

  if (newPassword === currentPassword) {
    throw createError({ statusCode: 400, message: '新密码与当前密码相同' })
  }

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
    actorType: 'user',
    action: 'user.password.change',
    resourceType: 'user',
    resourceId: String(authUser.id),
  })

  return null
})

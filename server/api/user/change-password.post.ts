// 已登录用户修改密码：校验旧密码 → 设新密码 → 令所有旧 token 失效并重签当前设备
import type { H3Event } from 'h3'
import { createError } from 'h3'
import { userChangePasswordSchema } from '~~/server/schemas/user'
import { usersService } from '~~/server/services/user-service'
import { hashPassword, verifyPassword, requireAuth, createUserSession } from '~~/server/utils/auth'
import { operationLogService } from '~~/server/services/operation-log-service'
import { readZodBody } from '~~/server/utils/zod'

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

  // tokenVersion 自增 → 该账号所有已签发 JWT（含当前设备）立即失效；
  // 随即为当前设备重签新 token（createUserSession 内部读到 bump 后的新 ver），
  // 实现「下线其他设备、保留当前设备」。
  await usersService.bumpTokenVersion(authUser.id)
  await createUserSession(event, { id: authUser.id, role: authUser.role })

  await operationLogService.addLog({
    userId: authUser.id,
    actor: authUser.username,
    action: 'user.password.change',
    resourceType: 'user',
    resourceId: String(authUser.id)
  })

  return null
})

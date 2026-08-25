// 消费 reset_password token 并设置新密码。
import { createError } from 'h3'
import { resetPasswordSchema } from '~~/server/schemas/auth'
import { userService } from '~~/server/services/user-service'
import { verifyVerificationToken } from '~~/server/utils/verification-token'
import { systemSettingsService } from '~~/server/services/system-settings-service'
import { hashPassword } from '~~/server/utils/password'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { readZodBody } from '~~/server/utils/zod'

export default defineEventHandler(async (event) => {
  const settings = await systemSettingsService.getSettings()
  if (!settings.passwordResetEnabled) {
    throw createError({ statusCode: 403, message: '密码重置功能已关闭' })
  }

  const { userId, token, newPassword } = await readZodBody(event, resetPasswordSchema)

  const user = await userService.getById(userId)
  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  const tokenPayload = verifyVerificationToken(token, user, 'reset_password')
  if (!tokenPayload || tokenPayload.email !== user.email) {
    throw createError({ statusCode: 400, message: 'Reset link expired or invalid' })
  }

  const passwordHash = await hashPassword(newPassword)
  await userService.updatePasswordAndInvalidateSessions(userId, passwordHash)

  // 凭据变更 + 全会话失效必须留痕：走重置链接改密与走 user.password.change 改密
  // 在追溯上是同等事件，缺一条就意味着「拿到泄露的重置 token 改密」是无痕路径。
  // 操作者是匿名请求，因此只能记账号自身的身份快照。
  await addRequestOperationLog(event, {
    userId: user.id,
    actor: user.username,
    action: 'user.password.reset',
    resourceType: 'user',
    resourceId: user.id,
    detail: { sessionsInvalidated: true }
  })

  return null
})

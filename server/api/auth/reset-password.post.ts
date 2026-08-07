// 消费 reset_password token 并设置新密码。
import { createError } from 'h3'
import { resetPasswordSchema } from '~~/server/schemas/auth'
import { userService } from '~~/server/services/user-service'
import { verifyVerificationToken } from '~~/server/utils/verification-token'
import { systemSettingsService } from '~~/server/services/system-settings-service'
import { hashPassword } from '~~/server/utils/password'
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

  return null
})

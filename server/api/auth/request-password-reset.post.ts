// 申请密码重置：发邮件到注册邮箱。无论邮箱是否存在都返回 200，避免泄露用户存在性。
import type { H3Event } from 'h3'
import { createError, getRequestIP, readBody } from 'h3'
import { usersService } from '~~/server/service/userService'
import { siteSettingsService } from '~~/server/service/siteSettingsService'
import { verificationTokenService } from '~~/server/service/emailVerificationService'
import { sendPasswordResetEmail } from '~~/server/utils/email'
import { validateEmail } from '~~/server/utils/validation'

export default defineEventHandler(async (event: H3Event) => {
  const body = await readBody(event) as Record<string, any>
  const email = (body.email || '').toString().trim().toLowerCase()

  if (!email || !validateEmail(email)) {
    throw createError({ statusCode: 400, message: 'Invalid email address' })
  }

  const user = await usersService.findByEmail(email)
  if (user && user.isActive && !user.isBanned) {
    const settings = await siteSettingsService.getOrCreate()
    const expiresInMinutes = Number(settings.passwordResetExpiresInMinutes || 30)
    const ip = getRequestIP(event) || null
    const { token } = await verificationTokenService.createToken(user.id, user.email, expiresInMinutes, 'reset_password', ip)
    const normalizedSiteUrl = (settings.siteUrl || 'http://localhost:3000').replace(/\/+$/g, '')
    const resetUrl = `${normalizedSiteUrl}/reset-password?user=${user.id}&token=${token}`
    // 发信失败仅记录日志，不把错误抛给前端以免泄露账号是否存在。
    try {
      await sendPasswordResetEmail(user.email, resetUrl)
    }
    catch (error) {
      console.error('failed to send password reset email', { userId: user.id, error })
    }
  }

  return { code: 0, msg: 'ok', data: null }
})

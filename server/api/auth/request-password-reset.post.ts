// 申请密码重置：发邮件到注册邮箱。无论邮箱是否存在都返回 200，避免泄露用户存在性。
import type { H3Event } from 'h3'
import { createError, getRequestIP, readBody } from 'h3'
import { usersService } from '~~/server/service/userService'
import { siteSettingsService } from '~~/server/service/siteSettingsService'
import { verificationTokenService } from '~~/server/service/verificationTokenService'
import { sendPasswordResetEmail } from '~~/server/utils/email'
import { validateEmail } from '~~/server/utils/validation'
import { assertTurnstileForPage } from '~~/server/utils/turnstile'
import { getRateLimiter } from '~~/server/utils/rateLimit'

export default defineEventHandler(async (event: H3Event) => {
  const settings = await siteSettingsService.getOrCreate()

  if (!settings.passwordResetEnabled) {
    throw createError({ statusCode: 403, message: '密码重置功能已关闭' })
  }

  const body = await readBody(event) as Record<string, unknown>
  const email = String(body.email ?? '').trim().toLowerCase()
  const turnstileToken = String(body.turnstileToken ?? '')

  const ip = getRequestIP(event) || null

  // 先校验 Turnstile：失败时直接抛错，与“邮箱是否存在”无关，不会构成枚举信号。
  await assertTurnstileForPage('passwordReset', turnstileToken, ip)

  if (!email || !validateEmail(email)) {
    throw createError({ statusCode: 400, message: 'Invalid email address' })
  }

  // 防刷：同一邮箱 60s 1 次、IP 维度 1 小时 10 次。超限静默拒绝（仍返回 200，不暴露阈值与是否存在）。
  const limiter = getRateLimiter()
  const emailLimit = await limiter.consume(`password-reset:email:${email}`, 1, 'minute')
  if (!emailLimit.allowed) {
    return null
  }
  if (ip) {
    const ipLimit = await limiter.consume(`password-reset:ip:${ip}`, 10, 'hour')
    if (!ipLimit.allowed) {
      return null
    }
  }

  const user = await usersService.findByEmail(email)
  if (user && user.isActive && !user.isBanned) {
    const expiresInMinutes = Number(settings.passwordResetExpiresInMinutes || 30)
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

  return null
})

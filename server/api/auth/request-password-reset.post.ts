// 申请密码重置：发邮件到注册邮箱。无论邮箱是否存在都返回 200，避免泄露用户存在性。
import type { H3Event } from 'h3'
import { createError, getRequestIP } from 'h3'
import { requestPasswordResetSchema } from '#shared/schemas/auth'
import { usersService } from '~~/server/services/user-service'
import { siteSettingsService } from '~~/server/services/site-settings-service'
import { issueVerificationTokenUrl } from '~~/server/utils/verification-token'
import { sendPasswordResetEmail } from '~~/server/utils/email'
import { assertTurnstileForPage } from '~~/server/utils/turnstile'
import { canConsumeIdentityRateLimit } from '~~/server/utils/rate-limit/identity'
import { readZodBody } from '~~/server/utils/zod'
import { isBanActive } from '~~/server/utils/ban'

export default defineEventHandler(async (event: H3Event) => {
  const settings = await siteSettingsService.getOrCreate()

  if (!settings.passwordResetEnabled) {
    throw createError({ statusCode: 403, message: '密码重置功能已关闭' })
  }

  const body = await readZodBody(event, requestPasswordResetSchema)
  const { email } = body
  const turnstileToken = body.turnstileToken ?? ''

  const ip = getRequestIP(event) || null

  // 先校验 Turnstile：失败时直接抛错，与“邮箱是否存在”无关，不会构成枚举信号。
  await assertTurnstileForPage('passwordReset', turnstileToken, ip)

  // 防刷：同一邮箱 60s 1 次、IP 维度 1 小时 10 次。超限静默拒绝（仍返回 200，不暴露阈值与是否存在）。
  const canRequestReset = await canConsumeIdentityRateLimit({
    namespace: 'password-reset',
    buckets: [
      { name: 'email', value: email, limit: 1, window: 'minute' },
      { name: 'ip', value: ip, limit: 10, window: 'hour' }
    ]
  })
  if (!canRequestReset) return null

  const user = await usersService.findByEmail(email)
  if (user && user.isActive && !isBanActive(user)) {
    const expiresInMinutes = Number(settings.passwordResetExpiresInMinutes || 30)
    const resetUrl = issueVerificationTokenUrl(user, {
      siteUrl: settings.siteUrl,
      path: 'reset-password',
      purpose: 'reset_password',
      email: user.email,
      expiresInMinutes
    })
    // 发信失败仅记录日志，不把错误抛给前端以免泄露账号是否存在。
    try {
      await sendPasswordResetEmail(user.email, resetUrl)
    } catch (error) {
      console.error('failed to send password reset email', { userId: user.id, error })
    }
  }

  return null
})

import { createError, getHeader, getRequestIP } from 'h3'
import { loginSchema } from '~~/server/schemas/auth'
import { usersService } from '~~/server/services/user-service'
import { loginLogService } from '~~/server/services/login-log-service'
import { createUserSession, verifyPassword } from '~~/server/utils/auth'
import { assertTurnstileForPage } from '~~/server/utils/turnstile'
import { canConsumeIdentityRateLimit } from '~~/server/utils/rate-limit/identity'
import { readZodBody } from '~~/server/utils/zod'
import { banMessage, isBanActive } from '~~/server/utils/ban'

export default defineEventHandler(async (event) => {
  const body = await readZodBody(event, loginSchema)
  const emailOrUsername = body.email || body.username || ''
  const { password } = body
  const turnstileToken = body.turnstileToken ?? ''
  const remember = body.remember === true

  const ip = getRequestIP(event) || '0.0.0.0'
  const userAgent = getHeader(event, 'user-agent') || null
  const canAttemptLogin = await canConsumeIdentityRateLimit({
    namespace: 'login',
    buckets: [
      { name: 'account', value: emailOrUsername, limit: 5, window: 'minute' },
      { name: 'ip', value: ip, limit: 30, window: 'minute' }
    ]
  })
  if (!canAttemptLogin) {
    throw createError({ statusCode: 429, message: '尝试次数过多，请稍后再试' })
  }
  await assertTurnstileForPage('login', turnstileToken, ip)

  // 支持通过 email 或 username 登录；用户和管理员共用 users 表，用 role 决定登录后的入口。
  const user = emailOrUsername.includes('@')
    ? await usersService.findByEmail(emailOrUsername)
    : await usersService.findByUsername(emailOrUsername)

  // 未识别用户（账号不存在）：不写登录日志，避免攻击者通过日志枚举存在的用户
  if (!user) {
    throw createError({ statusCode: 401, message: '账号或密码错误' })
  }

  const ok = await verifyPassword(user.passwordHash, password)
  if (!ok) {
    await loginLogService.record({
      userId: user.id,
      username: user.username,
      method: 'password',
      success: false,
      failureReason: 'invalid_password',
      ip,
      userAgent
    })
    throw createError({ statusCode: 401, message: '账号或密码错误' })
  }

  if (user.isBanned && isBanActive(user)) {
    await loginLogService.record({
      userId: user.id,
      username: user.username,
      method: 'password',
      success: false,
      failureReason: 'banned',
      ip,
      userAgent
    })
    throw createError({ statusCode: 403, message: banMessage(user) })
  }
  if (user.isBanned) {
    // 封禁已到期 → 惰性解封后继续登录
    await usersService.clearExpiredBan(user.id)
  }

  if (!user.isActive) {
    await loginLogService.record({
      userId: user.id,
      username: user.username,
      method: 'password',
      success: false,
      failureReason: 'not_active',
      ip,
      userAgent
    })
    throw createError({ statusCode: 403, message: '邮箱尚未验证，请先到注册邮箱完成验证' })
  }

  await createUserSession(event, {
    id: user.id,
    role: user.role
  }, { remember })

  await usersService.updateLastLogin(user.id, ip, userAgent)
  await loginLogService.record({
    userId: user.id,
    username: user.username,
    method: 'password',
    success: true,
    ip,
    userAgent
  })

  const { passwordHash: _, ...safe } = user

  return safe
})
// 登录接口

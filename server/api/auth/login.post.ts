import type { H3Event } from 'h3'
import { createError, getHeader, getRequestIP } from 'h3'
import { loginSchema } from '#shared/schemas/auth'
import { usersService } from '~~/server/service/userService'
import { loginLogService } from '~~/server/service/loginLogService'
import { createUserSession, verifyPassword } from '~~/server/utils/auth'
import { assertTurnstileForPage } from '~~/server/utils/turnstile'
import { readZodBody } from '~~/server/utils/zod'

export default defineEventHandler(async (event: H3Event) => {
  const body = await readZodBody(event, loginSchema)
  const emailOrUsername = body.email || body.username || ''
  const { password } = body
  const turnstileToken = body.turnstileToken ?? ''
  const remember = body.remember === true

  const ip = getRequestIP(event) || '0.0.0.0'
  const userAgent = getHeader(event, 'user-agent') || null
  await assertTurnstileForPage('login', turnstileToken, ip)

  // 支持通过 email 或 username 登录
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
      method: 'password',
      success: false,
      failureReason: 'invalid_password',
      ip,
      userAgent
    })
    throw createError({ statusCode: 401, message: '账号或密码错误' })
  }

  if (user.isBanned) {
    await loginLogService.record({
      userId: user.id,
      method: 'password',
      success: false,
      failureReason: 'banned',
      ip,
      userAgent
    })
    throw createError({ statusCode: 403, message: '账号已被封禁，如有疑问请联系管理员' })
  }

  if (!user.isActive) {
    await loginLogService.record({
      userId: user.id,
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
    kind: 'user'
  }, { remember })

  await usersService.updateLastLogin(user.id, ip, userAgent)
  await loginLogService.record({
    userId: user.id,
    method: 'password',
    success: true,
    ip,
    userAgent
  })

  const { passwordHash: _, ...safe } = user

  return { ...safe, kind: 'user' }
})
// 登录接口

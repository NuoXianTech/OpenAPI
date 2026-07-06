// OAuth 待绑定身份 → 绑定到「已有账号」：窗口内账密验证账号归属后再 link，然后登录。
import type { H3Event } from 'h3'
import { createError, getHeader, getRequestIP } from 'h3'
import { oauthBindSchema } from '#shared/schemas/auth'
import { readZodBody } from '~~/server/utils/zod'
import { readPendingOauth, clearPendingOauth } from '~~/server/utils/oauth-pending'
import { usersService } from '~~/server/services/user-service'
import { oauthAccountService } from '~~/server/services/oauth-account-service'
import { loginLogService, type LoginMethod } from '~~/server/services/login-log-service'
import { createUserSession, verifyPassword } from '~~/server/utils/auth'
import { getRateLimiter } from '~~/server/utils/rate-limit/memory'
import { banMessage, isBanActive } from '#shared/utils/ban'

export default defineEventHandler(async (event: H3Event) => {
  const pending = readPendingOauth(event)
  if (!pending) {
    throw createError({ statusCode: 410, message: '绑定会话已过期，请重新发起第三方登录' })
  }

  const body = await readZodBody(event, oauthBindSchema)
  const identifier = body.identifier
  const ip = getRequestIP(event) || '0.0.0.0'
  const userAgent = getHeader(event, 'user-agent') || null
  const method: LoginMethod = pending.provider === 'github' ? 'oauth_github' : 'oauth_qq'

  // 校验密码且未接 Turnstile，按 IP 轻量限流防爆破
  const limiter = getRateLimiter()
  const limit = await limiter.consume(`oauth-bind:ip:${ip}`, 10, 'minute')
  if (!limit.allowed) {
    throw createError({ statusCode: 429, message: '尝试次数过多，请稍后再试' })
  }

  const user = identifier.includes('@')
    ? await usersService.findByEmail(identifier.toLowerCase())
    : await usersService.findByUsername(identifier)

  // 账号不存在与密码错误合并为同一响应，避免账号枚举
  if (!user || !(await verifyPassword(user.passwordHash, body.password))) {
    throw createError({ statusCode: 401, message: '账号或密码错误' })
  }

  if (user.isBanned && isBanActive(user)) {
    throw createError({ statusCode: 403, message: banMessage(user) })
  }
  if (user.isBanned) {
    await usersService.clearExpiredBan(user.id)
  }
  if (!user.isActive) {
    throw createError({ statusCode: 403, message: '该账号尚未激活，请先完成邮箱验证后再绑定' })
  }

  // 三方身份已被他人绑定
  const existing = await oauthAccountService.findByProviderUserId(pending.provider, pending.providerUserId)
  if (existing && existing.userId !== user.id) {
    throw createError({ statusCode: 409, message: '该第三方账号已被其他用户绑定' })
  }
  // 该用户已绑定同 provider 的另一个账号（(userId, provider) 唯一）
  const sameProvider = await oauthAccountService.findByUserAndProvider(user.id, pending.provider)
  if (sameProvider && sameProvider.providerUserId !== pending.providerUserId) {
    throw createError({ statusCode: 409, message: '你已绑定该平台的另一个账号，请先解绑后再绑定' })
  }

  await oauthAccountService.upsertAccount({
    userId: user.id,
    provider: pending.provider,
    providerUserId: pending.providerUserId,
    nickname: pending.nickname,
    avatarUrl: pending.avatarUrl,
    email: pending.email,
    lastLoginIp: ip
  })

  clearPendingOauth(event)
  await createUserSession(event, { id: user.id, kind: 'user' })
  await usersService.updateLastLogin(user.id, ip, userAgent)
  await loginLogService.record({ userId: user.id, method, success: true, ip, userAgent })

  return { ok: true }
})

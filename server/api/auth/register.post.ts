// 注册接口
import type { H3Event } from 'h3'
import { createError, getRequestIP } from 'h3'
import { registerSchema } from '#shared/schemas/auth'
import { usersService } from '~~/server/service/userService'
import { hashPassword } from '~~/server/utils/auth'
import { isEmailAllowedForRegistration, normalizeEmailFilterMode, parseEmailDomainList } from '~~/server/utils/validation'
import { readZodBody } from '~~/server/utils/zod'
import { verificationTokenService } from '../../service/verificationTokenService'
import { sendDuplicateRegistrationEmail, sendVerificationEmail } from '~~/server/utils/email'
import { siteSettingsService } from '~~/server/service/siteSettingsService'
import { assertTurnstileForPage } from '~~/server/utils/turnstile'
import { getRateLimiter } from '~~/server/utils/rateLimit'

// 注册接口对外永远返回此中性响应，避免通过 HTTP 状态/文案区分"邮箱已注册 / 用户名已占用 / 注册成功"，
// 防止匿名访问者用接口差异遍历账号库。真实分支信号只走邮件通道。
const NEUTRAL_RESPONSE = { verificationRequired: true } as const

export default defineEventHandler(async (event: H3Event) => {
  const settings = await siteSettingsService.getOrCreate()

  // 注册模式闸门：closed 直接拒绝，invite 要求有邀请码字段（先留 TODO 占位）。
  const mode = settings.registrationMode || 'open'
  if (mode === 'closed') {
    throw createError({ statusCode: 403, message: '注册功能已关闭' })
  }

  const body = await readZodBody(event, registerSchema)
  const { username, email, password } = body
  const turnstileToken = body.turnstileToken ?? ''

  const ip = getRequestIP(event) || null

  // 先校验 Turnstile：失败时直接抛错，与"邮箱/用户名是否存在"无关，不会构成枚举信号。
  await assertTurnstileForPage('register', turnstileToken, ip)

  // 防刷：同一邮箱 60s 1 次、IP 维度 1 小时 10 次。超限静默拒绝（仍返回中性响应，不暴露阈值与是否存在）。
  const limiter = getRateLimiter()
  const emailLimit = await limiter.consume(`register:email:${email}`, 1, 'minute')
  if (!emailLimit.allowed) {
    return NEUTRAL_RESPONSE
  }
  if (ip) {
    const ipLimit = await limiter.consume(`register:ip:${ip}`, 10, 'hour')
    if (!ipLimit.allowed) {
      return NEUTRAL_RESPONSE
    }
  }

  // 邮箱域名过滤：off=不过滤；whitelist=仅允许列表内域名；blacklist=拒绝列表内域名
  const filterMode = normalizeEmailFilterMode(settings.registerEmailFilterMode)
  const domains = parseEmailDomainList(settings.registerEmailFilterList)
  if (!isEmailAllowedForRegistration(email, filterMode, domains)) {
    const msg = filterMode === 'blacklist' ? '该邮箱域名已被禁止注册' : '该邮箱域名不在允许注册的列表内'
    throw createError({ statusCode: 403, message: msg })
  }

  if (mode === 'invite') {
    // TODO: 接入邀请码校验（当前版本未实现，拒绝以保持安全默认）
    throw createError({ statusCode: 403, message: '仅邀请注册模式下未开放通道' })
  }

  const normalizedSiteUrl = (settings.siteUrl || 'http://localhost:3000').replace(/\/+$/g, '')

  // 邮箱已注册：投递"账号已存在"通知到该邮箱，外部返回中性响应。
  // 发信失败仅记录日志，不抛错，保持与"邮箱未注册"分支响应一致以防 timing/状态码枚举。
  const existEmail = await usersService.findByEmail(email)
  if (existEmail) {
    try {
      await sendDuplicateRegistrationEmail(email, `${normalizedSiteUrl}/login`)
    } catch (error) {
      console.error('[register] failed to send duplicate-registration notice', { error })
    }
    return NEUTRAL_RESPONSE
  }

  // 用户名已被占用：静默返回中性响应。不向用户填写的邮箱发"用户名冲突"通知，
  // 避免攻击者控制邮箱后通过邮件内容反推目标用户名是否存在。
  const existUser = await usersService.findByUsername(username)
  if (existUser) {
    return NEUTRAL_RESPONSE
  }

  const passwordHash = await hashPassword(password)

  const created = await usersService.addUser({
    username,
    email,
    passwordHash,
    isActive: false
  })

  const expiresInMinutes = Number(settings.emailVerifyExpiresInMinutes || 30)
  const { token } = await verificationTokenService.createToken(created.id, created.email, expiresInMinutes, 'verify', ip)
  const verifyUrl = `${normalizedSiteUrl}/verify-email?user=${created.id}&token=${token}`
  try {
    await sendVerificationEmail(email, verifyUrl)
  } catch (error) {
    // 邮件发不出去就把刚建的账号回滚，否则邮箱/用户名会被占住，用户无法重试。
    // verification_tokens 通过外键 cascade 一起清掉。
    console.error('[register] failed to send verification email, rolling back user', { userId: created.id, error })
    try {
      await usersService.deleteUser(created.id)
    } catch (rollbackError) {
      console.error('[register] failed to rollback user after email failure', { userId: created.id, error: rollbackError })
    }
    throw createError({
      statusCode: 503,
      message: '验证邮件发送失败，请稍后重试或联系管理员检查邮件服务配置'
    })
  }

  return NEUTRAL_RESPONSE
})

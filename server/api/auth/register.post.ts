// 注册接口
import type { H3Event } from 'h3'
import { createError, getRequestIP } from 'h3'
import { registerSchema } from '#shared/schemas/auth'
import { usersService } from '~~/server/service/userService'
import { hashPassword } from '~~/server/utils/auth'
import { isEmailAllowedForRegistration, normalizeEmailFilterMode, parseEmailDomainList } from '~~/server/utils/validation'
import { readZodBody } from '~~/server/utils/zod'
import { verificationTokenService } from '../../service/verificationTokenService'
import { sendVerificationEmail } from '~~/server/utils/email'
import { siteSettingsService } from '~~/server/service/siteSettingsService'
import { assertTurnstileForPage } from '~~/server/utils/turnstile'

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
  await assertTurnstileForPage('register', turnstileToken, ip)

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

  // 检查是否已存在同名或同邮箱用户
  const existEmail = await usersService.findByEmail(email)
  if (existEmail) {
    throw createError({ statusCode: 409, message: '该邮箱已被注册，请直接登录或更换邮箱' })
  }
  const existUser = await usersService.findByUsername(username)
  if (existUser) {
    throw createError({ statusCode: 409, message: '该用户名已被占用，请更换后重试' })
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
  const normalizedSiteUrl = (settings.siteUrl || 'http://localhost:3000').replace(/\/+$/g, '')
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

  const { passwordHash: _, ...safe } = created

  return {
    user: safe,
    verificationRequired: true
  }
})

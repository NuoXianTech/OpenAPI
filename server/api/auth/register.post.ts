import type { H3Event } from 'h3'
import { createError, getRequestIP } from 'h3'
import { registerSchema } from '#shared/schemas/auth'
import { usersService } from '~~/server/services/user-service'
import { hashPassword } from '~~/server/utils/auth'
import { isEmailAllowedForRegistration, normalizeEmailFilterMode, parseEmailDomainList } from '~~/server/utils/validation'
import { readZodBody } from '~~/server/utils/zod'
import { issueVerificationTokenUrl, normalizeSiteUrl } from '~~/server/utils/verification-token'
import { sendDuplicateRegistrationEmail, sendVerificationEmail } from '~~/server/utils/email'
import { siteSettingsService } from '~~/server/services/site-settings-service'
import { assertTurnstileForPage } from '~~/server/utils/turnstile'
import { canConsumeAnonymousEmailIpRateLimit } from '~~/server/utils/rate-limit/anonymous-action'
import { rollbackCreatedUser } from '~~/server/utils/registration'

// 注册接口对外永远返回中性响应，避免通过 HTTP 状态/文案区分"邮箱已注册 / 用户名已占用 / 注册成功"，
// 防止匿名访问者用接口差异遍历账号库。真实分支信号只走邮件通道。
// 响应里的 verificationRequired 取决于站点是否开启邮件激活：同一激活模式下所有分支返回值一致，
// 不会因"是否需要验证"泄露账号是否存在。

export default defineEventHandler(async (event: H3Event) => {
  const settings = await siteSettingsService.getOrCreate()

  // 邮件激活总开关：开启=注册后须邮件验证；关闭=注册即激活、不发验证邮件
  const activationRequired = settings.emailActivationEnabled !== false
  const neutralResponse = { verificationRequired: activationRequired }

  // 注册模式闸门：closed 直接拒绝；invite 当前保持安全默认，不开放匿名注册。
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
  const canRegister = await canConsumeAnonymousEmailIpRateLimit({
    namespace: 'register',
    email,
    ip,
    emailLimit: 1,
    ipLimit: 10
  })
  if (!canRegister) return neutralResponse

  // 邮箱域名过滤：off=不过滤；whitelist=仅允许列表内域名；blacklist=拒绝列表内域名
  const filterMode = normalizeEmailFilterMode(settings.registerEmailFilterMode)
  const domains = parseEmailDomainList(settings.registerEmailFilterList)
  if (!isEmailAllowedForRegistration(email, filterMode, domains)) {
    const msg = filterMode === 'blacklist' ? '该邮箱域名已被禁止注册' : '该邮箱域名不在允许注册的列表内'
    throw createError({ statusCode: 403, message: msg })
  }

  if (mode === 'invite') {
    throw createError({ statusCode: 403, message: '仅邀请注册模式下未开放通道' })
  }

  // 邮箱已注册：投递"账号已存在"通知到该邮箱，外部返回中性响应。
  // 发信失败仅记录日志，不抛错，保持与"邮箱未注册"分支响应一致以防 timing/状态码枚举。
  const existEmail = await usersService.findByEmail(email)
  if (existEmail) {
    try {
      await sendDuplicateRegistrationEmail(email, `${normalizeSiteUrl(settings.siteUrl)}/login`)
    } catch (error) {
      console.error('[register] failed to send duplicate-registration notice', { error })
    }
    return neutralResponse
  }

  // 用户名已被占用：静默返回中性响应。不向用户填写的邮箱发"用户名冲突"通知，
  // 避免攻击者控制邮箱后通过邮件内容反推目标用户名是否存在。
  const existUser = await usersService.findByUsername(username)
  if (existUser) {
    return neutralResponse
  }

  const passwordHash = await hashPassword(password)

  const created = await usersService.addUser({
    username,
    email,
    passwordHash,
    isActive: false
  })

  // 关闭邮件激活：注册即激活（activateUser 负责赠分 + 补发历史通知），不发验证邮件。
  // activateUser 失败则回滚刚建的账号，避免邮箱/用户名被占住无法重试。
  if (!activationRequired) {
    try {
      await usersService.activateUser(created.id)
    } catch (error) {
      await rollbackCreatedUser({ userId: created.id, reason: 'auto-activation failed', error })
      throw createError({
        statusCode: 503,
        message: '注册失败，请稍后重试或联系管理员'
      })
    }
    return neutralResponse
  }

  const expiresInMinutes = Number(settings.emailVerifyExpiresInMinutes || 30)
  const verifyUrl = issueVerificationTokenUrl(created, {
    siteUrl: settings.siteUrl,
    path: 'verify-email',
    purpose: 'verify',
    email: created.email,
    expiresInMinutes
  })
  try {
    await sendVerificationEmail(email, verifyUrl)
  } catch (error) {
    await rollbackCreatedUser({ userId: created.id, reason: 'verification email failed', error })
    throw createError({
      statusCode: 503,
      message: '验证邮件发送失败，请稍后重试或联系管理员检查邮件服务配置'
    })
  }

  return neutralResponse
})

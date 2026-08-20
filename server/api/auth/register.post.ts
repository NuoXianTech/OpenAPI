import { createError } from 'h3'
import { registerSchema } from '~~/server/schemas/auth'
import { userService } from '~~/server/services/user-service'
import { hashPassword } from '~~/server/utils/password'
import {
  isEmailAllowedForRegistration,
  isRegistrationInviteValid,
  normalizeEmailFilterMode,
  normalizeRegistrationMode,
  parseEmailDomainList
} from '~~/server/utils/registration'
import { readZodBody } from '~~/server/utils/zod'
import { normalizeSiteUrl } from '~~/server/utils/verification-token'
import { sendDuplicateRegistrationEmail } from '~~/server/utils/email'
import { systemSettingsService } from '~~/server/services/system-settings-service'
import { registrationService } from '~~/server/services/registration-service'
import { assertTurnstileForPage } from '~~/server/utils/turnstile'
import { canConsumeIdentityRateLimit } from '~~/server/utils/rate-limit/identity'
import { readClientIp, toClientIpRateLimitValue } from '~~/server/utils/request-meta'
import { getSqlState } from '~~/server/utils/database-error'

// 注册接口对外永远返回中性响应，避免通过 HTTP 状态/文案区分"邮箱已注册 / 用户名已占用 / 注册成功"，
// 防止匿名访问者用接口差异遍历账号库。真实分支信号只走邮件通道。
// 响应里的 verificationRequired 取决于站点是否开启邮件激活：同一激活模式下所有分支返回值一致，
// 不会因"是否需要验证"泄露账号是否存在。

export default defineEventHandler(async (event) => {
  const settings = await systemSettingsService.getSettings()

  // 邮件激活总开关：开启=注册后须邮件验证；关闭=注册即激活、不发验证邮件
  const activationRequired = settings.emailActivationEnabled !== false
  const neutralResponse = { verificationRequired: activationRequired }

  const mode = normalizeRegistrationMode(settings.registrationMode)
  if (mode === 'closed') {
    throw createError({ statusCode: 403, message: '注册功能已关闭' })
  }

  const body = await readZodBody(event, registerSchema)
  const { username, email, password, inviteCode } = body
  const turnstileToken = body.turnstileToken ?? ''

  const ip = readClientIp(event)

  // 先校验 Turnstile：失败时直接抛错，与"邮箱/用户名是否存在"无关，不会构成枚举信号。
  await assertTurnstileForPage('register', turnstileToken, ip)

  // IP 限流先于邀请码校验，避免匿名请求暴力探测邀请码。
  const canRegisterFromIp = await canConsumeIdentityRateLimit({
    namespace: 'register',
    buckets: [{ name: 'ip', value: toClientIpRateLimitValue(ip), limit: 10, window: 'hour' }]
  })
  if (!canRegisterFromIp) return neutralResponse

  // 邮箱域名过滤：off=不过滤；whitelist=仅允许列表内域名；blacklist=拒绝列表内域名
  const filterMode = normalizeEmailFilterMode(settings.registerEmailFilterMode)
  const domains = parseEmailDomainList(settings.registerEmailFilterList)
  if (!isEmailAllowedForRegistration(email, filterMode, domains)) {
    const msg = filterMode === 'blacklist' ? '该邮箱域名已被禁止注册' : '该邮箱域名不在允许注册的列表内'
    throw createError({ statusCode: 403, message: msg })
  }

  if (mode === 'invite') {
    if (!isRegistrationInviteValid(settings.registrationInviteCode, inviteCode)) {
      throw createError({ statusCode: 403, message: '邀请码无效' })
    }
  }

  // 只有请求通过域名和邀请码策略后才消费邮箱限流；用户输错邀请码后可立即改正。
  const canRegisterEmail = await canConsumeIdentityRateLimit({
    namespace: 'register',
    buckets: [{ name: 'email', value: email, limit: 1, window: 'minute' }]
  })
  if (!canRegisterEmail) return neutralResponse

  // 邮箱已注册：投递"账号已存在"通知到该邮箱，外部返回中性响应。
  // 发信失败仅记录日志，不抛错，保持与"邮箱未注册"分支响应一致以防 timing/状态码枚举。
  const existEmail = await userService.findByEmail(email)
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
  const existUser = await userService.findByUsername(username)
  if (existUser) {
    return neutralResponse
  }

  const passwordHash = await hashPassword(password)

  let created: Awaited<ReturnType<typeof userService.addUser>>
  try {
    created = await userService.addUser({
      username,
      email,
      passwordHash,
      isActive: false
    })
  } catch (error) {
    if (getSqlState(error) === '23505') return neutralResponse
    throw error
  }

  await registrationService.completeRegistration({
    user: created,
    settings,
    reasonPrefix: 'password registration'
  })
  return neutralResponse
})

// OAuth 待绑定身份 → 「新注册」：用户在窗口确认/填写邮箱后建号并绑定三方身份，
// 随后按站点邮件激活策略：关闭激活则立即登录，开启则发验证邮件、账号待激活。
import { createError, getHeader } from 'h3'
import { randomBytes } from 'node:crypto'
import { oauthRegisterSchema } from '~~/server/schemas/auth'
import type { LoginMethod } from '#shared/types/login-log'
import { readZodBody } from '~~/server/utils/zod'
import { readPendingOauth, clearPendingOauth } from '~~/server/utils/oauth-pending'
import { usersService } from '~~/server/services/user-service'
import { oauthAccountService } from '~~/server/services/oauth-account-service'
import { issueVerificationTokenUrl } from '~~/server/utils/verification-token'
import { systemSettingsService } from '~~/server/services/system-settings-service'
import { loginLogService } from '~~/server/services/login-log-service'
import { operationLogService } from '~~/server/services/operation-log-service'
import { createUserSession, hashPassword } from '~~/server/utils/auth'
import { sendVerificationEmail } from '~~/server/utils/email'
import { isEmailAllowedForRegistration, normalizeEmailFilterMode, parseEmailDomainList } from '~~/server/utils/validation'
import { getRateLimiter } from '~~/server/utils/rate-limit'
import { rollbackCreatedUser } from '~~/server/utils/registration'
import { readClientIp, toClientIpRateLimitValue } from '~~/server/utils/request-meta'

function sanitizeUsername(base: string) {
  return base.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 32) || 'user'
}

async function pickAvailableUsername(base: string) {
  const sanitized = sanitizeUsername(base)
  for (let i = 0; i < 5; i++) {
    const candidate = i === 0 ? sanitized : `${sanitized}_${randomBytes(2).toString('hex')}`
    if (!(await usersService.findByUsername(candidate))) {
      return candidate
    }
  }
  return `${sanitized}_${randomBytes(4).toString('hex')}`
}

export default defineEventHandler(async (event) => {
  const pending = readPendingOauth(event)
  if (!pending) {
    throw createError({ statusCode: 410, message: '注册会话已过期，请重新发起第三方登录' })
  }

  const settings = await systemSettingsService.getSettings()
  if (settings.oauthForceBinding) {
    throw createError({ statusCode: 403, message: '站点已设为强制绑定，请绑定已有账号' })
  }
  if ((settings.registrationMode || 'open') === 'closed') {
    throw createError({ statusCode: 403, message: '注册功能已关闭' })
  }

  const body = await readZodBody(event, oauthRegisterSchema)
  const email = body.email
  const ip = readClientIp(event)
  const userAgent = getHeader(event, 'user-agent') || null
  const method: LoginMethod = pending.provider === 'github' ? 'oauth_github' : 'oauth_qq'

  const limiter = getRateLimiter()
  const limit = await limiter.consume(`oauth-register:ip:${toClientIpRateLimitValue(ip)}`, 10, 'hour')
  if (!limit.allowed) {
    throw createError({ statusCode: 429, message: '尝试次数过多，请稍后再试' })
  }

  // 邮箱域名过滤
  const filterMode = normalizeEmailFilterMode(settings.registerEmailFilterMode)
  const domains = parseEmailDomainList(settings.registerEmailFilterList)
  if (!isEmailAllowedForRegistration(email, filterMode, domains)) {
    const msg = filterMode === 'blacklist' ? '该邮箱域名已被禁止注册' : '该邮箱域名不在允许注册的列表内'
    throw createError({ statusCode: 403, message: msg })
  }

  // 邮箱已注册：持有效 pending 的用户应改走「绑定已有账号」
  if (await usersService.findByEmail(email)) {
    throw createError({ statusCode: 409, message: '该邮箱已注册，请改用「绑定已有账号」' })
  }

  // 用户名：提供则校验可用，未提供则由昵称派生
  let username: string
  if (body.username) {
    if (await usersService.findByUsername(body.username)) {
      throw createError({ statusCode: 409, message: '该用户名已被占用' })
    }
    username = body.username
  } else {
    username = await pickAvailableUsername(pending.nickname || pending.provider)
  }

  const activationRequired = settings.emailActivationEnabled !== false
  const passwordHash = await hashPassword(body.password)

  const created = await usersService.addUser({
    username,
    email,
    passwordHash,
    displayName: pending.nickname || username,
    isActive: false
  })
  if (!created) {
    throw createError({ statusCode: 503, message: '注册失败，请稍后重试' })
  }

  // 立即把三方身份绑到新账号（用户硬删 / 回滚时 cascade 一并清除）
  const linkedAccount = await oauthAccountService.upsertAccount({
    userId: created.id,
    provider: pending.provider,
    providerUserId: pending.providerUserId,
    nickname: pending.nickname,
    avatarUrl: pending.avatarUrl,
    email: pending.email,
    lastLoginIp: ip
  })

  await operationLogService.addRequestLog(event, {
    userId: created.id,
    actor: created.username,
    action: 'user.oauth.register',
    resourceType: 'oauth-account',
    resourceId: linkedAccount?.id ?? pending.provider,
    detail: { provider: pending.provider }
  })

  // 关闭邮件激活：注册即激活（activateUser 负责赠分 + 补发历史通知）并立即登录
  if (!activationRequired) {
    try {
      await usersService.activateUser(created.id)
    } catch (error) {
      await rollbackCreatedUser({ userId: created.id, reason: 'oauth auto-activation failed', error })
      throw createError({ statusCode: 503, message: '注册失败，请稍后重试或联系管理员' })
    }
    clearPendingOauth(event)
    await createUserSession(event, { id: created.id, role: 'user' })
    await usersService.updateLastLogin(created.id, ip, userAgent)
    await loginLogService.record({ userId: created.id, username: created.username, method, success: true, ip, userAgent })
    return { ok: true, verificationRequired: false }
  }

  // 开启邮件激活：发验证邮件，账号待激活；发信失败回滚（绑定随 cascade 清）
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
    await rollbackCreatedUser({ userId: created.id, reason: 'oauth verification email failed', error })
    throw createError({ statusCode: 503, message: '验证邮件发送失败，请稍后重试或联系管理员检查邮件服务配置' })
  }

  clearPendingOauth(event)
  return { ok: true, verificationRequired: true }
})

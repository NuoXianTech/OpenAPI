import type { H3Event } from 'h3'
import { randomBytes } from 'node:crypto'
import { getHeader, getQuery, getRequestIP, sendRedirect } from 'h3'
import { buildCallbackUrl, oauthProviderService } from '~~/server/service/oauthProviderService'
import { oauthAccountService } from '~~/server/service/oauthAccountService'
import { siteSettingsService } from '~~/server/service/siteSettingsService'
import { usersService } from '~~/server/service/userService'
import { loginLogService } from '~~/server/service/loginLogService'
import { consumeState } from '~~/server/utils/oauthState'
import { decryptSecret } from '~~/server/utils/oauthCrypto'
import { createUserSession, getAuthUser, hashPassword } from '~~/server/utils/auth'
import { isEmailAllowedForRegistration, normalizeEmailFilterMode, parseEmailDomainList } from '~~/server/utils/validation'
import { githubProvider } from '~~/server/utils/oauthProviders/github'
import { qqProvider } from '~~/server/utils/oauthProviders/qq'
import type { ProviderConfig, ProviderProfile, TokenResult } from '~~/server/utils/oauthProviders/types'
import type { LoginMethod } from '~~/server/service/loginLogService'
import type { SupportedOauthProvider } from '~~/shared/types/oauth'
import { isBanActive } from '#shared/utils/ban'

function methodFromProvider(provider: SupportedOauthProvider): LoginMethod {
  return provider === 'github' ? 'oauth_github' : 'oauth_qq'
}

async function redirectError(event: H3Event, code: string, mode: 'login' | 'bind' = 'login') {
  const target = mode === 'bind'
    ? `/user/profile?oauth_error=${encodeURIComponent(code)}`
    : `/login?oauth_error=${encodeURIComponent(code)}`
  return sendRedirect(event, target, 302)
}

function sanitizeUsername(base: string) {
  return base.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 40) || 'user'
}

async function pickAvailableUsername(base: string) {
  const sanitized = sanitizeUsername(base)
  for (let i = 0; i < 5; i++) {
    const candidate = i === 0 ? sanitized : `${sanitized}_${randomBytes(2).toString('hex')}`
    const existing = await usersService.findByUsername(candidate)
    if (!existing) {
      return candidate
    }
  }
  return `${sanitized}_${randomBytes(4).toString('hex')}`
}

/**
 * OAuth 回调统一处理：交换 code → 拉取 profile → 登录 / 绑定 / 自动注册。
 * 入参 provider 已由路由层（如 /callback/openid/[index]）解析过。
 */
export async function handleOauthCallback(event: H3Event, provider: SupportedOauthProvider) {
  const settings = await siteSettingsService.getOrCreate()
  if (!settings.oauthLoginEnabled) {
    return redirectError(event, 'oauth_disabled')
  }

  const query = getQuery(event)
  const stateParam = typeof query.state === 'string' ? query.state : null
  const consumed = consumeState(event, provider, stateParam)
  if (!consumed) {
    return redirectError(event, 'state_mismatch')
  }

  if (typeof query.error === 'string' && query.error) {
    return redirectError(event, String(query.error), consumed.mode)
  }

  const code = typeof query.code === 'string' ? query.code : null
  if (!code) {
    return redirectError(event, 'missing_code', consumed.mode)
  }

  const providerRow = await oauthProviderService.getByProvider(provider)
  if (!providerRow || !providerRow.isEnabled || !providerRow.clientId || !providerRow.clientSecret) {
    return redirectError(event, 'provider_unavailable', consumed.mode)
  }

  let clientSecret = ''
  try {
    clientSecret = decryptSecret(providerRow.clientSecret)
  } catch {
    return redirectError(event, 'secret_decrypt_failed', consumed.mode)
  }

  const providerConfig: ProviderConfig = {
    clientId: providerRow.clientId,
    clientSecret,
    callbackUrl: buildCallbackUrl(settings.siteUrl, provider)
  }

  try {
    let token: TokenResult
    let profile: ProviderProfile

    if (provider === 'github') {
      token = await githubProvider.exchangeCode(providerConfig, code)
      profile = await githubProvider.fetchUserInfo(providerConfig, token.accessToken, token)
    } else {
      token = await qqProvider.exchangeCode(providerConfig, code)
      profile = await qqProvider.fetchUserInfo(providerConfig, token.accessToken, token)
    }

    const ip = getRequestIP(event) || null
    const userAgent = getHeader(event, 'user-agent') || null
    const method = methodFromProvider(provider)

    // ============ bind 模式：当前已登录用户主动绑定 ============
    if (consumed.mode === 'bind') {
      const authUser = await getAuthUser(event)
      if (!authUser || authUser.kind !== 'user') {
        return redirectError(event, 'login_required', 'bind')
      }

      const existing = await oauthAccountService.findByProviderUserId(provider, profile.providerUserId)
      if (existing && existing.userId !== authUser.id) {
        return redirectError(event, 'already_bound_by_other', 'bind')
      }

      await oauthAccountService.upsertAccount({
        userId: authUser.id,
        provider,
        providerUserId: profile.providerUserId,
        nickname: profile.nickname,
        avatarUrl: profile.avatarUrl,
        email: profile.email,
        lastLoginIp: ip
      })

      const target = consumed.returnTo && consumed.returnTo.startsWith('/')
        ? consumed.returnTo
        : '/user/profile'
      const sep = target.includes('?') ? '&' : '?'
      return sendRedirect(event, `${target}${sep}oauth_bound=${provider}`, 302)
    }

    // ============ login 模式 ============

    const existingAccount = await oauthAccountService.findByProviderUserId(provider, profile.providerUserId)
    if (existingAccount) {
      await oauthAccountService.upsertAccount({
        userId: existingAccount.userId,
        provider,
        providerUserId: profile.providerUserId,
        nickname: profile.nickname,
        avatarUrl: profile.avatarUrl,
        email: profile.email,
        lastLoginIp: ip
      })

      const user = await usersService.getById(existingAccount.userId)
      if (!user) {
        // 用户已被硬删，oauthAccounts 通过 cascade 应已清理；保险起见仍 redirect
        return redirectError(event, 'user_unavailable')
      }
      if (user.isBanned && isBanActive(user)) {
        await loginLogService.record({ userId: user.id, method, success: false, failureReason: 'banned', ip, userAgent })
        return redirectError(event, 'user_unavailable')
      }
      if (user.isBanned) {
        await usersService.clearExpiredBan(user.id)
      }
      await createUserSession(event, { id: user.id, kind: 'user' })
      await usersService.updateLastLogin(user.id, ip || '0.0.0.0', userAgent)
      await loginLogService.record({ userId: user.id, method, success: true, ip, userAgent })
      return sendRedirect(event, consumed.returnTo || '/', 302)
    }

    let targetUserId: number | null = null
    if (profile.email) {
      const matched = await usersService.findByEmail(profile.email.toLowerCase())
      if (matched) {
        if (matched.isBanned && isBanActive(matched)) {
          await loginLogService.record({ userId: matched.id, method, success: false, failureReason: 'banned', ip, userAgent })
          return redirectError(event, 'user_banned')
        }
        if (matched.isBanned) {
          await usersService.clearExpiredBan(matched.id)
        }
        targetUserId = matched.id
      }
    }

    if (targetUserId === null) {
      if (settings.oauthForceBinding) {
        return redirectError(event, 'binding_required')
      }
      if (!profile.email) {
        return redirectError(event, 'email_required')
      }
      // 自动注册路径同样受邮箱域名过滤约束
      const filterMode = normalizeEmailFilterMode(settings.registerEmailFilterMode)
      const domains = parseEmailDomainList(settings.registerEmailFilterList)
      if (!isEmailAllowedForRegistration(profile.email.toLowerCase(), filterMode, domains)) {
        return redirectError(event, 'email_not_allowed')
      }
      const username = await pickAvailableUsername(profile.nickname || `${provider}_${profile.providerUserId}`)
      const randomPasswordHash = await hashPassword(randomBytes(32).toString('base64url'))
      const created = await usersService.addUser({
        username,
        email: profile.email.toLowerCase(),
        passwordHash: randomPasswordHash,
        displayName: profile.nickname || username,
        isActive: true
      })
      if (!created) {
        return redirectError(event, 'user_create_failed')
      }
      await usersService.activateUser(created.id)
      targetUserId = created.id
    }

    if (targetUserId === null) {
      return redirectError(event, 'user_resolve_failed')
    }

    const finalUserId: number = targetUserId

    await oauthAccountService.upsertAccount({
      userId: finalUserId,
      provider,
      providerUserId: profile.providerUserId,
      nickname: profile.nickname,
      avatarUrl: profile.avatarUrl,
      email: profile.email,
      lastLoginIp: ip
    })

    await createUserSession(event, { id: finalUserId, kind: 'user' })
    await usersService.updateLastLogin(finalUserId, ip || '0.0.0.0', userAgent)
    await loginLogService.record({ userId: finalUserId, method, success: true, ip, userAgent })
    return sendRedirect(event, consumed.returnTo || '/', 302)
  } catch (err: unknown) {
    console.error('[oauth callback] failed', err)
    return redirectError(event, 'callback_failed', consumed.mode)
  }
}

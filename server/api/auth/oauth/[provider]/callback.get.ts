import type { H3Event } from 'h3'
import { randomBytes } from 'node:crypto'
import { getQuery, getRequestIP, getRouterParam, sendRedirect } from 'h3'
import { oauthProviderService } from '~~/server/service/oauthProviderService'
import { oauthAccountService } from '~~/server/service/oauthAccountService'
import { usersService } from '~~/server/service/userService'
import { consumeState } from '~~/server/utils/oauthState'
import { decryptSecret } from '~~/server/utils/oauthCrypto'
import { createUserSession, hashPassword } from '~~/server/utils/auth'
import * as github from '~~/server/utils/oauthProviders/github'

async function redirectError(event: H3Event, code: string) {
  return sendRedirect(event, `/login?oauth_error=${encodeURIComponent(code)}`, 302)
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

export default defineEventHandler(async (event: H3Event) => {
  const provider = (getRouterParam(event, 'provider') || '').toLowerCase()
  if (!provider) {
    return redirectError(event, 'invalid_provider')
  }

  const query = getQuery(event)
  const stateParam = typeof query.state === 'string' ? query.state : null
  const consumed = consumeState(event, provider, stateParam)
  if (!consumed) {
    return redirectError(event, 'state_mismatch')
  }

  if (typeof query.error === 'string' && query.error) {
    return redirectError(event, String(query.error))
  }

  const code = typeof query.code === 'string' ? query.code : null
  if (!code) {
    return redirectError(event, 'missing_code')
  }

  const providerRow = await oauthProviderService.getDecryptedByProvider(provider)
  if (!providerRow || !providerRow.isEnabled) {
    return redirectError(event, 'provider_unavailable')
  }

  let clientSecret = ''
  try {
    clientSecret = decryptSecret(providerRow.clientSecret)
  }
  catch {
    return redirectError(event, 'secret_decrypt_failed')
  }

  const providerConfig: github.ProviderConfig = {
    provider: providerRow.provider,
    clientId: providerRow.clientId,
    clientSecret,
    scopes: providerRow.scopes || [],
    callbackUrl: providerRow.callbackUrl,
    authorizeUrl: providerRow.authorizeUrl,
    tokenUrl: providerRow.tokenUrl,
    userInfoUrl: providerRow.userInfoUrl,
  }

  try {
    let token: github.TokenResult
    let profile: github.ProviderProfile

    switch (provider) {
      case 'github':
        token = await github.exchangeCode(providerConfig, code)
        profile = await github.fetchUserInfo(providerConfig, token.accessToken, token)
        break
      default:
        return redirectError(event, 'provider_not_implemented')
    }

    const ip = getRequestIP(event) || null

    // 1) 已绑定：直接登录
    const existingAccount = await oauthAccountService.findByProviderUserId(provider, profile.providerUserId)
    if (existingAccount) {
      await oauthAccountService.upsertAccount({
        userId: existingAccount.userId,
        provider,
        providerUserId: profile.providerUserId,
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        tokenExpiresAt: token.tokenExpiresAt,
        scope: token.scope,
        nickname: profile.nickname,
        avatarUrl: profile.avatarUrl,
        email: profile.email,
        profileRaw: profile.profileRaw,
        lastLoginIp: ip,
      })

      const user = await usersService.getById(existingAccount.userId)
      if (!user || user.isBanned) {
        return redirectError(event, 'user_unavailable')
      }
      await createUserSession(event, { id: user.id, kind: 'user' })
      await usersService.updateLastLogin(user.id, ip || '0.0.0.0')
      return sendRedirect(event, consumed.returnTo || '/', 302)
    }

    // 2) email 命中既有用户：自动绑定
    let targetUserId: number | null = null
    if (profile.email) {
      const matched = await usersService.findByEmail(profile.email.toLowerCase())
      if (matched) {
        if (matched.isBanned) {
          return redirectError(event, 'user_banned')
        }
        targetUserId = matched.id
      }
    }

    // 3) 没命中：新建用户（无密码登录路径 → 密码哈希用随机值，isActive=true 因为 email 经 provider 验证）
    if (targetUserId === null) {
      if (!profile.email) {
        return redirectError(event, 'email_required')
      }
      const username = await pickAvailableUsername(profile.nickname || `${provider}_${profile.providerUserId}`)
      const randomPasswordHash = await hashPassword(randomBytes(32).toString('base64url'))
      const created = await usersService.addUser({
        username,
        email: profile.email.toLowerCase(),
        passwordHash: randomPasswordHash,
        displayName: profile.nickname || username,
        isActive: true,
      })
      if (!created) {
        return redirectError(event, 'user_create_failed')
      }
      await usersService.activateUser(created.id)
      if (profile.avatarUrl) {
        await usersService.updateUser(created.id, { avatarUrl: profile.avatarUrl })
      }
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
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      tokenExpiresAt: token.tokenExpiresAt,
      scope: token.scope,
      nickname: profile.nickname,
      avatarUrl: profile.avatarUrl,
      email: profile.email,
      profileRaw: profile.profileRaw,
      lastLoginIp: ip,
    })

    await createUserSession(event, { id: finalUserId, kind: 'user' })
    await usersService.updateLastLogin(finalUserId, ip || '0.0.0.0')
    return sendRedirect(event, consumed.returnTo || '/', 302)
  }
  catch (err: unknown) {
    console.error('[oauth callback] failed', err)
    return redirectError(event, 'callback_failed')
  }
})

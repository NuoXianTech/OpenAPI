import { createHash } from 'node:crypto'
import type { H3Event } from 'h3'
import { isSupportedLocale } from '#shared/config/locale-defaults'
import { createError, defineEventHandler, getCookie, getRequestURL, setCookie, setResponseHeader } from 'h3'
import { assertAdminOnboardingCompleted } from '~~/server/services/admin-onboarding-service'
import { userService } from '~~/server/services/user-service'
import { systemSettingsService } from '~~/server/services/system-settings-service'
import { toHttpError } from '~~/server/utils/http-error'
import { signAccessToken, verifyAccessToken, type VerifiedToken } from '~~/server/utils/jwt'
import { banMessage, isBanActive } from '~~/server/utils/ban'
import { hostCookieName, hostCookieSecurityOptions } from '~~/server/utils/host-cookie'

interface AuthUserPayload {
  id: number
  role?: 'user' | 'admin'
}

// 会话完全由 JWT 承载、无服务端会话表；此 cookie 装签发的 JWT。
const AUTH_COOKIE_NAME = hostCookieName('app_token')

function getCravatarUrl(email: string | null | undefined) {
  const normalized = (email ?? '').trim().toLowerCase()
  const hash = createHash('md5').update(normalized).digest('hex')
  return `https://cravatar.cn/avatar/${hash}`
}

async function getSessionMaxAgesSeconds() {
  const settings = await systemSettingsService.getSettings()
  return {
    defaultMaxAge: Number(settings.sessionMaxAgeSeconds),
    absoluteMaxAge: Number(settings.sessionAbsoluteMaxAgeSeconds),
    rememberMaxAge: Number(settings.sessionRememberMaxAgeSeconds)
  }
}

function setAuthCookie(event: H3Event, token: string, maxAgeSeconds: number) {
  setCookie(event, AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    ...hostCookieSecurityOptions(),
    maxAge: maxAgeSeconds
  })
}

export function clearAuthCookie(event: H3Event) {
  setCookie(event, AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    ...hostCookieSecurityOptions(),
    maxAge: 0
  })
}

export async function createUserSession(event: H3Event, user: AuthUserPayload, options: { remember?: boolean } = {}) {
  const { defaultMaxAge, rememberMaxAge } = await getSessionMaxAgesSeconds()
  const remember = Boolean(options.remember)
  const ttlSeconds = remember ? rememberMaxAge : defaultMaxAge
  // 从 DB 取当前 role/tokenVersion 嵌入 token，避免调用方传入过期角色导致会话降级或越权。
  const row = await userService.getById(user.id)
  if (!row) {
    throw createError({ statusCode: 401, message: 'unauthorized' })
  }
  const loginAt = Math.floor(Date.now() / 1000)
  setAuthCookie(event, signAccessToken({ sub: user.id, role: row.role as 'user' | 'admin', ver: row.tokenVersion, loginAt, rmb: remember }, ttlSeconds), ttlSeconds)
}

export function destroyCurrentSession(event: H3Event) {
  // 无状态：登出仅清本机 cookie；服务端全局失效需要自增该用户的 tokenVersion。
  clearAuthCookie(event)
}

// token 剩余寿命不足一半时重签（最新 ver + 原 loginAt + 原 rmb），维持活跃会话不掉线。
// 纯 token 操作、零 DB 写；loginAt 透传以保持绝对硬顶基准不被重置。
async function maybeSlidingRenew(
  event: H3Event,
  payload: VerifiedToken,
  latestVer: number,
  ages: Awaited<ReturnType<typeof getSessionMaxAgesSeconds>>
) {
  const { defaultMaxAge, absoluteMaxAge, rememberMaxAge } = ages
  const ttl = payload.rmb ? rememberMaxAge : defaultMaxAge
  const now = Math.floor(Date.now() / 1000)
  const absoluteDeadline = payload.loginAt + (payload.rmb ? rememberMaxAge : absoluteMaxAge)
  const remainingAbsolute = absoluteDeadline - now
  const remaining = payload.exp - now
  if (remaining >= ttl / 2) {
    return
  }
  const renewalTtl = Math.min(ttl, remainingAbsolute)
  if (renewalTtl <= 0) return
  const fresh = signAccessToken({
    sub: payload.sub,
    role: payload.role,
    ver: latestVer,
    loginAt: payload.loginAt,
    rmb: payload.rmb
  }, renewalTtl)
  setAuthCookie(event, fresh, renewalTtl)
}

export async function getAuthUser(event: H3Event) {
  const token = getCookie(event, AUTH_COOKIE_NAME)
  if (!token) {
    return null
  }

  const payload = verifyAccessToken(token)
  if (!payload) {
    // 验签失败 / 过期 → 清残留 cookie，等同未登录
    clearAuthCookie(event)
    return null
  }

  // user / admin 都在 users 表：查库拿最新 tokenVersion / 封禁状态 / 资料。
  const user = await userService.getById(payload.sub)
  if (!user) {
    clearAuthCookie(event)
    return null
  }
  if (user.role !== payload.role) {
    clearAuthCookie(event)
    return null
  }

  // tokenVersion 比对：改密 / 重置 / 全局登出后旧 token 立即失效
  if (user.tokenVersion !== payload.ver) {
    clearAuthCookie(event)
    return null
  }

  // Both regular and remembered sessions have an absolute lifetime. Remember
  // Me changes the limit to the configured 30-day window; it is not perpetual.
  const ages = await getSessionMaxAgesSeconds()
  const absoluteMaxAge = payload.rmb ? ages.rememberMaxAge : ages.absoluteMaxAge
  if (Math.floor(Date.now() / 1000) - payload.loginAt >= absoluteMaxAge) {
    clearAuthCookie(event)
    return null
  }
  if (!user.isActive) {
    clearAuthCookie(event)
    return null
  }

  if (user.isBanned) {
    if (isBanActive(user)) {
      clearAuthCookie(event)
      throw createError({ statusCode: 403, message: banMessage(user) })
    }
    // 封禁已到期 → 惰性解封后放行
    await userService.clearExpiredBan(user.id)
  }

  await maybeSlidingRenew(event, payload, user.tokenVersion, ages)

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    avatarUrl: getCravatarUrl(user.email),
    role: user.role as 'user' | 'admin',
    locale: isSupportedLocale(user.locale) ? user.locale : null
  }
}

export async function requireAuth(event: H3Event) {
  const user = await getAuthUser(event)
  if (!user || (user.role !== 'user' && user.role !== 'admin')) {
    throw createError({ statusCode: 401, message: 'unauthorized' })
  }
  return user
}

export async function requireAdmin(event: H3Event) {
  const user = await getAuthUser(event)
  if (!user || user.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'forbidden' })
  }
  return user
}
interface AuthorizedEventHandler<TUser, TResult> {
  (event: H3Event, user: TUser): TResult | Promise<TResult>
}

function defineAuthorizedEventHandler<TUser, TResult>(
  authorize: (event: H3Event) => Promise<TUser>,
  handler: AuthorizedEventHandler<TUser, TResult>
) {
  return defineEventHandler(async (event) => {
    setResponseHeader(event, 'cache-control', 'private, no-store')
    try {
      return await handler(event, await authorize(event))
    } catch (error) {
      throw toHttpError(error)
    }
  })
}

export function defineAuthenticatedEventHandler<TResult>(
  handler: AuthorizedEventHandler<NonNullable<Awaited<ReturnType<typeof getAuthUser>>>, TResult>
) {
  return defineAuthorizedEventHandler(requireAuth, handler)
}

export function defineAdminEventHandler<TResult>(
  handler: AuthorizedEventHandler<NonNullable<Awaited<ReturnType<typeof getAuthUser>>>, TResult>
) {
  return defineAuthorizedEventHandler(requireAdmin, async (event, admin) => {
    await assertAdminOnboardingCompleted(admin, getRequestURL(event).pathname)
    return handler(event, admin)
  })
}

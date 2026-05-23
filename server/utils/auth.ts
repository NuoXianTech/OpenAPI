import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import type { BinaryLike, ScryptOptions } from 'node:crypto'
import { promisify } from 'node:util'
import type { H3Event } from 'h3'
import { createError, getCookie, getHeader, getRequestIP, setCookie } from 'h3'
import { usersService } from '~~/server/service/userService'
import { sessionService } from '~~/server/service/sessionService'
import { siteSettingsService } from '~~/server/service/siteSettingsService'
import { getCravatarUrl } from '~~/server/utils/cravatar'

export interface AuthUserPayload {
  id: number
  kind: 'user' | 'admin'
}

// admin 伪用户写表时使用的 actor id：所有 operatorId/createdBy/userId 等
// "操作者 = admin 内置账号" 的场景都必须落 null，0 不是 users.id 的有效值，
// 误把 0 写进外键列会让审计/关联查询很难排查。
export const ADMIN_ACTOR_ID = null

// util.promisify 只识别 scrypt(password, salt, keylen, cb) 这一个 overload，
// 想传 options 必须断言成带 options 的签名。
const scrypt = promisify(scryptCallback) as (
  password: BinaryLike,
  salt: BinaryLike,
  keylen: number,
  options?: ScryptOptions
) => Promise<Buffer>
const COOKIE_NAME = 'app_session'
const SALT_BYTES = 16
const KEY_LENGTH = 64

// 当前默认 scrypt 参数；调整这里相当于升级新注册用户的强度，
// 历史哈希仍按其落库时的参数校验（见 verifyPassword）。
const SCRYPT_DEFAULTS = { N: 16384, r: 8, p: 1 } as const

function base64UrlEncode(input: Buffer | string) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input)
  return buffer.toString('base64')
    .replace(/=+$/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function base64UrlDecode(input: string) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  return Buffer.from(padded, 'base64')
}

function scryptOptions(params: { N: number, r: number, p: number }) {
  const { N, r, p } = params
  // Node 默认 maxmem=32MiB，调大 N/r 会超限；按公式预留两倍头空间
  const memNeeded = 128 * N * r + 128 * r * p
  return { N, r, p, maxmem: Math.max(memNeeded * 2, 32 << 20) }
}

function formatScryptParams(params: { N: number, r: number, p: number }) {
  return `N=${params.N},r=${params.r},p=${params.p}`
}

function parseScryptParams(spec: string) {
  const out: Partial<{ N: number, r: number, p: number }> = {}
  for (const entry of spec.split(',')) {
    const [key, value] = entry.split('=')
    if (!key || !value) return null
    const num = Number(value)
    if (!Number.isFinite(num) || num <= 0) return null
    if (key === 'N') out.N = num
    else if (key === 'r') out.r = num
    else if (key === 'p') out.p = num
    else return null
  }
  if (!out.N || !out.r || !out.p) return null
  return out as { N: number, r: number, p: number }
}

export async function hashPassword(password: string) {
  const salt = randomBytes(SALT_BYTES)
  const derived = await scrypt(password, salt, KEY_LENGTH, scryptOptions(SCRYPT_DEFAULTS)) as Buffer
  return `scrypt$${formatScryptParams(SCRYPT_DEFAULTS)}$${base64UrlEncode(salt)}$${base64UrlEncode(derived)}`
}

export async function verifyPassword(stored: string, password: string) {
  const parts = stored.split('$')
  if (parts[0] !== 'scrypt') {
    return false
  }

  let params: { N: number, r: number, p: number }
  let saltPart: string
  let hashPart: string

  if (parts.length === 4) {
    // 新格式：scrypt$N=...,r=...,p=...$salt$hash
    const parsed = parseScryptParams(parts[1] ?? '')
    if (!parsed || !parts[2] || !parts[3]) return false
    params = parsed
    saltPart = parts[2]
    hashPart = parts[3]
  } else if (parts.length === 3) {
    // 旧格式：scrypt$salt$hash，落库时未带参数，沿用 Node scrypt 默认（与 SCRYPT_DEFAULTS 一致）
    if (!parts[1] || !parts[2]) return false
    params = SCRYPT_DEFAULTS
    saltPart = parts[1]
    hashPart = parts[2]
  } else {
    return false
  }

  const salt = base64UrlDecode(saltPart)
  const hash = base64UrlDecode(hashPart)
  const derived = await scrypt(password, salt, hash.length, scryptOptions(params)) as Buffer
  return hash.length === derived.length && timingSafeEqual(hash, derived)
}

async function getSessionMaxAgesSeconds() {
  const settings = await siteSettingsService.getOrCreate()
  return {
    defaultMaxAge: Number(settings.sessionMaxAgeSeconds),
    absoluteMaxAge: Number(settings.sessionAbsoluteMaxAgeSeconds),
    rememberMaxAge: Number(settings.sessionRememberMaxAgeSeconds)
  }
}

function getClientContext(event: H3Event) {
  return {
    ip: getRequestIP(event) || null,
    userAgent: getHeader(event, 'user-agent') || null
  }
}

export async function createUserSession(event: H3Event, user: AuthUserPayload, options: { remember?: boolean } = {}) {
  const { defaultMaxAge, rememberMaxAge } = await getSessionMaxAgesSeconds()
  const remember = Boolean(options.remember)
  const maxAgeSeconds = remember ? rememberMaxAge : defaultMaxAge
  const { ip, userAgent } = getClientContext(event)
  const { sessionId } = await sessionService.createSession({
    userId: user.id,
    kind: 'user',
    ip,
    userAgent,
    isRemembered: remember
  }, maxAgeSeconds)
  setAuthCookie(event, sessionId, maxAgeSeconds)
}

export async function createAdminSession(event: H3Event, options: { remember?: boolean } = {}) {
  const { defaultMaxAge, rememberMaxAge } = await getSessionMaxAgesSeconds()
  const remember = Boolean(options.remember)
  const maxAgeSeconds = remember ? rememberMaxAge : defaultMaxAge
  const { ip, userAgent } = getClientContext(event)

  const { sessionId } = await sessionService.createSession({
    userId: null,
    kind: 'admin',
    ip,
    userAgent,
    isRemembered: remember
  }, maxAgeSeconds)
  setAuthCookie(event, sessionId, maxAgeSeconds)
}

export function setAuthCookie(event: H3Event, sessionId: string, maxAgeSeconds: number) {
  setCookie(event, COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: maxAgeSeconds
  })
}

export function clearAuthCookie(event: H3Event) {
  setCookie(event, COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  })
}

export async function getAuthUser(event: H3Event) {
  const sessionId = getCookie(event, COOKIE_NAME)
  if (!sessionId) {
    return null
  }

  const session = await sessionService.getSessionById(sessionId)
  if (!session) {
    return null
  }

  // 「记住我」会话保持登录时给定的固定到期时间；普通会话每次活跃都滑动续期，
  // 但绝不允许跨过 createdAt + sessionAbsoluteMaxAgeSeconds 的硬顶。
  if (session.isRemembered) {
    // fail-open：touch 失败不影响本次鉴权，但需留痕便于排查 DB 写入异常
    sessionService.touchSession(sessionId).catch((err) => {
      console.error('[auth] failed to touch remembered session', { sessionId, err })
    })
  } else {
    const { defaultMaxAge, absoluteMaxAge } = await getSessionMaxAgesSeconds()
    const nowMs = Date.now()
    const absoluteExpiryMs = session.createdAt.getTime() + absoluteMaxAge * 1000

    // 已经撞到硬顶 → 立刻清掉会话，等同未登录
    if (absoluteExpiryMs <= nowMs) {
      await sessionService.deleteSession(sessionId)
      clearAuthCookie(event)
      return null
    }

    const slidingExpiryMs = nowMs + defaultMaxAge * 1000
    const newExpiryMs = Math.min(slidingExpiryMs, absoluteExpiryMs)
    // 必须先 await DB 续期成功，再下发新的 cookie maxAge；否则 cookie 写了「续期成功」的
    // maxAge，但库里 expiresAt 仍是旧值，下一次请求会被 getSessionById 判过期踢出，
    // 形成「明明 cookie 没过期却莫名要重新登录」的不一致状态。
    try {
      await sessionService.extendSessionExpiry(sessionId, new Date(newExpiryMs))
      const cookieMaxAge = Math.max(1, Math.floor((newExpiryMs - nowMs) / 1000))
      setAuthCookie(event, sessionId, cookieMaxAge)
    } catch (err) {
      // DB 续期失败：本次请求仍按当前会话通过，但不下发新 cookie maxAge；
      // 下一次请求若 DB 恢复会自然重新续期，否则随旧 expiresAt 自然过期。
      console.error('[auth] failed to extend session expiry, cookie maxAge left unchanged', { sessionId, err })
    }
  }

  if (session.kind === 'admin') {
    const authConfig = useRuntimeConfig().auth
    return {
      id: ADMIN_ACTOR_ID,
      username: authConfig.adminUsername,
      email: authConfig.adminEmail,
      avatarUrl: getCravatarUrl(authConfig.adminEmail),
      kind: 'admin' as const
    }
  }

  if (!session.userId) {
    return null
  }

  const user = await usersService.getById(session.userId)
  if (!user) {
    return null
  }

  if (user.isBanned) {
    await sessionService.deleteSession(sessionId)
    clearAuthCookie(event)
    throw createError({ statusCode: 403, message: 'Account is banned' })
  }

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    avatarUrl: getCravatarUrl(user.email),
    kind: 'user' as const
  }
}

export async function requireAuth(event: H3Event) {
  const user = await getAuthUser(event)
  if (!user || user.kind !== 'user') {
    throw createError({ statusCode: 401, message: 'unauthorized' })
  }
  return user
}

export async function requireAdmin(event: H3Event) {
  const user = await getAuthUser(event)
  if (!user || user.kind !== 'admin') {
    throw createError({ statusCode: 403, message: 'forbidden' })
  }
  return user
}

export async function destroyCurrentSession(event: H3Event) {
  const sessionId = getCookie(event, COOKIE_NAME)
  if (sessionId) {
    await sessionService.deleteSession(sessionId)
  }
  clearAuthCookie(event)
}

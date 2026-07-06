import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import type { BinaryLike, ScryptOptions } from 'node:crypto'
import { promisify } from 'node:util'
import type { H3Event } from 'h3'
import { createError, getCookie, setCookie } from 'h3'
import { usersService } from '~~/server/services/user-service'
import { siteSettingsService } from '~~/server/services/site-settings-service'
import { getCravatarUrl } from '~~/server/utils/cravatar'
import { signAccessToken, verifyAccessToken, type VerifiedToken } from '~~/server/utils/jwt'
import { banMessage, isBanActive } from '~~/server/utils/ban'

interface AuthUserPayload {
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

// 会话完全由 JWT 承载、无服务端会话表；此 cookie 装签发的 JWT。
const AUTH_COOKIE_NAME = 'app_token'
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

function setAuthCookie(event: H3Event, token: string, maxAgeSeconds: number) {
  setCookie(event, AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: maxAgeSeconds
  })
}

export function clearAuthCookie(event: H3Event) {
  setCookie(event, AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0
  })
}

export async function createUserSession(event: H3Event, user: AuthUserPayload, options: { remember?: boolean } = {}) {
  const { defaultMaxAge, rememberMaxAge } = await getSessionMaxAgesSeconds()
  const remember = Boolean(options.remember)
  const ttlSeconds = remember ? rememberMaxAge : defaultMaxAge
  // 取当前 tokenVersion 嵌入 token（登录 / 重签均低频，多查一次可接受）。
  // 改密后重签会读到 bump 过的新 ver，从而当前设备拿新 token、其他设备旧 token 失效。
  const row = await usersService.getById(user.id)
  const ver = row?.tokenVersion ?? 0
  const loginAt = Math.floor(Date.now() / 1000)
  setAuthCookie(event, signAccessToken({ sub: user.id, kind: 'user', ver, loginAt, rmb: remember }, ttlSeconds), ttlSeconds)
}

export async function createAdminSession(event: H3Event, options: { remember?: boolean } = {}) {
  const { defaultMaxAge, rememberMaxAge } = await getSessionMaxAgesSeconds()
  const remember = Boolean(options.remember)
  const ttlSeconds = remember ? rememberMaxAge : defaultMaxAge
  const loginAt = Math.floor(Date.now() / 1000)
  // admin 不在 users 表、无 tokenVersion：ver 恒 0 且鉴权时不校验
  setAuthCookie(event, signAccessToken({ sub: ADMIN_ACTOR_ID, kind: 'admin', ver: 0, loginAt, rmb: remember }, ttlSeconds), ttlSeconds)
}

export function destroyCurrentSession(event: H3Event) {
  // 无状态：登出仅清本机 cookie；该 token 无法被服务端撤销（需全局失效用 usersService.bumpTokenVersion）。
  clearAuthCookie(event)
}

// token 剩余寿命不足一半时重签（最新 ver + 原 loginAt + 原 rmb），维持活跃会话不掉线。
// 纯 token 操作、零 DB 写；loginAt 透传以保持绝对硬顶基准不被重置。
async function maybeSlidingRenew(event: H3Event, payload: VerifiedToken, latestVer: number) {
  const { defaultMaxAge, rememberMaxAge } = await getSessionMaxAgesSeconds()
  const ttl = payload.rmb ? rememberMaxAge : defaultMaxAge
  const remaining = payload.exp - Math.floor(Date.now() / 1000)
  if (remaining >= ttl / 2) {
    return
  }
  const fresh = signAccessToken({
    sub: payload.sub,
    kind: payload.kind,
    ver: latestVer,
    loginAt: payload.loginAt,
    rmb: payload.rmb
  }, ttl)
  setAuthCookie(event, fresh, ttl)
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

  // admin：不在 users 表，不查库、不校验 ver
  if (payload.kind === 'admin') {
    await maybeSlidingRenew(event, payload, payload.ver)
    const authConfig = useRuntimeConfig().auth
    return {
      id: ADMIN_ACTOR_ID,
      username: authConfig.adminUsername,
      email: authConfig.adminEmail,
      avatarUrl: getCravatarUrl(authConfig.adminEmail),
      kind: 'admin' as const
    }
  }

  // user：查库拿最新 tokenVersion / 封禁状态 / 资料
  if (payload.sub === null) {
    clearAuthCookie(event)
    return null
  }

  const user = await usersService.getById(payload.sub)
  if (!user) {
    clearAuthCookie(event)
    return null
  }

  // tokenVersion 比对：改密 / 重置 / 全局登出后旧 token 立即失效
  if (user.tokenVersion !== payload.ver) {
    clearAuthCookie(event)
    return null
  }

  // 绝对硬顶（仅非「记住我」）：从首登算超过 absoluteMaxAge 强制重登
  const { absoluteMaxAge } = await getSessionMaxAgesSeconds()
  if (!payload.rmb && Math.floor(Date.now() / 1000) - payload.loginAt > absoluteMaxAge) {
    clearAuthCookie(event)
    return null
  }

  if (user.isBanned) {
    if (isBanActive(user)) {
      clearAuthCookie(event)
      throw createError({ statusCode: 403, message: banMessage(user) })
    }
    // 封禁已到期 → 惰性解封后放行
    await usersService.clearExpiredBan(user.id)
  }

  await maybeSlidingRenew(event, payload, user.tokenVersion)

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

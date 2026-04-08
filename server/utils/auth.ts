import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import type { H3Event } from 'h3'
import { createError, getCookie, setCookie } from 'h3'
import { usersService } from '~~/server/service/userService'
import { sessionService } from '~~/server/service/sessionService'
import { siteSettingsService } from '~~/server/service/siteSettingsService'

export interface AuthUserPayload {
  id: number
  kind: 'user' | 'admin'
}

const scrypt = promisify(scryptCallback)
const COOKIE_NAME = 'app_session'
const SALT_BYTES = 16
const KEY_LENGTH = 64

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

export async function hashPassword(password: string) {
  const salt = randomBytes(SALT_BYTES)
  const derived = await scrypt(password, salt, KEY_LENGTH) as Buffer
  return `scrypt$${base64UrlEncode(salt)}$${base64UrlEncode(derived)}`
}

export async function verifyPassword(stored: string, password: string) {
  const [scheme, saltPart, hashPart] = stored.split('$')
  if (scheme !== 'scrypt' || !saltPart || !hashPart) {
    return false
  }

  const salt = base64UrlDecode(saltPart)
  const hash = base64UrlDecode(hashPart)
  const derived = await scrypt(password, salt, hash.length) as Buffer
  return timingSafeEqual(hash, derived)
}

async function getSessionMaxAgeSeconds() {
  const settings = await siteSettingsService.getOrCreate()
  return Number(settings.sessionMaxAgeSeconds)
}

export async function createUserSession(event: H3Event, user: AuthUserPayload) {
  const maxAgeSeconds = await getSessionMaxAgeSeconds()
  const { sessionId } = await sessionService.createSession({
    userId: user.id,
    kind: 'user',
  }, maxAgeSeconds)
  setAuthCookie(event, sessionId, maxAgeSeconds)
}

export async function createAdminSession(event: H3Event) {
  const maxAgeSeconds = await getSessionMaxAgeSeconds()

  const { sessionId } = await sessionService.createSession({
    userId: null,
    kind: 'admin',
  }, maxAgeSeconds)
  setAuthCookie(event, sessionId, maxAgeSeconds)
}

export function setAuthCookie(event: H3Event, sessionId: string, maxAgeSeconds: number) {
  setCookie(event, COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: maxAgeSeconds,
  })
}

export function clearAuthCookie(event: H3Event) {
  setCookie(event, COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
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
  if (session.kind === 'admin') {
    const authConfig = useRuntimeConfig().auth
    return {
      id: 0,
      username: authConfig.adminUsername,
      email: authConfig.adminEmail,
      kind: 'admin' as const,
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
    email: user.email,
    kind: 'user' as const,
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

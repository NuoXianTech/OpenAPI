import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import type { H3Event } from 'h3'
import { createError, getCookie, setCookie } from 'h3'
import { sessionService } from '~~/server/service/sessionService'

export interface AuthUserPayload {
  id: number
  username: string
  email: string
  role: string
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
  const parts = stored.split('$')
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return false
  }

  const salt = base64UrlDecode(parts[1])
  const hash = base64UrlDecode(parts[2])
  const derived = await scrypt(password, salt, hash.length) as Buffer
  return timingSafeEqual(hash, derived)
}

function getSessionMaxAgeSeconds() {
  return Number(useRuntimeConfig().auth.sessionMaxAgeSeconds)
}

export async function createUserSession(event: H3Event, user: AuthUserPayload) {
  const maxAgeSeconds = getSessionMaxAgeSeconds()
  const { sessionId } = await sessionService.createSession({
    userId: user.id,
    role: user.role,
    username: user.username,
    email: user.email,
  }, maxAgeSeconds)
  setAuthCookie(event, sessionId, maxAgeSeconds)
}

export async function createAdminSession(event: H3Event) {
  const maxAgeSeconds = getSessionMaxAgeSeconds()
  const authConfig = useRuntimeConfig().auth
  const username = authConfig.adminUsername
  const email = authConfig.adminEmail

  const { sessionId } = await sessionService.createSession({
    userId: null,
    role: 'admin',
    username,
    email,
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
  return {
    id: session.userId ?? 0,
    username: session.username,
    email: session.email,
    role: session.role,
  }
}

export async function requireAuth(event: H3Event) {
  const user = await getAuthUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'unauthorized' })
  }
  return user
}

export async function requireAdmin(event: H3Event) {
  const user = await requireAuth(event)
  if (user.role !== 'admin') {
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

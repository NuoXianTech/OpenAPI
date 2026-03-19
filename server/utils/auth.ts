import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import type { H3Event } from 'h3'
import { createError, getCookie, setCookie } from 'h3'

export interface AuthUserPayload {
  id: number
  username: string
  email: string
  role: string
}

interface JwtConfig {
  jwtSecret: string
  jwtIssuer: string
  jwtExpiresInSeconds: number
}

const scrypt = promisify(scryptCallback)
const COOKIE_NAME = 'auth_token'
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

function signHmac(data: string, secret: string) {
  return base64UrlEncode(createHmac('sha256', secret).update(data).digest())
}

function getJwtConfig(): JwtConfig {
  const config = useRuntimeConfig().auth
  return {
    jwtSecret: config.jwtSecret,
    jwtIssuer: config.jwtIssuer,
    jwtExpiresInSeconds: config.jwtExpiresInSeconds,
  }
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

export function createAuthToken(user: AuthUserPayload) {
  const config = getJwtConfig()
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: config.jwtIssuer,
    iat: now,
    exp: now + config.jwtExpiresInSeconds,
    user,
  }
  const header = { alg: 'HS256', typ: 'JWT' }

  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const signature = signHmac(`${encodedHeader}.${encodedPayload}`, config.jwtSecret)
  const token = `${encodedHeader}.${encodedPayload}.${signature}`

  return { token, expiresInSeconds: config.jwtExpiresInSeconds }
}

export function verifyAuthToken(token: string) {
  const config = getJwtConfig()
  const parts = token.split('.')
  if (parts.length !== 3) {
    return null
  }

  const [encodedHeader, encodedPayload, signature] = parts
  const expected = signHmac(`${encodedHeader}.${encodedPayload}`, config.jwtSecret)
  if (signature.length !== expected.length) {
    return null
  }
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload).toString('utf8'))
    if (payload.iss !== config.jwtIssuer) {
      return null
    }

    if (payload.exp && Date.now() / 1000 > payload.exp) {
      return null
    }

    return payload as { user: AuthUserPayload }
  }
  catch {
    return null
  }
}

export function setAuthCookie(event: H3Event, token: string, maxAgeSeconds: number) {
  setCookie(event, COOKIE_NAME, token, {
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

export function getAuthUser(event: H3Event) {
  const token = getCookie(event, COOKIE_NAME)
  if (!token) {
    return null
  }

  const payload = verifyAuthToken(token)
  return payload?.user ?? null
}

export function requireAuth(event: H3Event) {
  const user = getAuthUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'unauthorized' })
  }
  return user
}

export function requireAdmin(event: H3Event) {
  const user = requireAuth(event)
  if (user.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'forbidden' })
  }
  return user
}

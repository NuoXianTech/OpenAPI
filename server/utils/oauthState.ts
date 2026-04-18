import type { H3Event } from 'h3'
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { getCookie, setCookie } from 'h3'

const STATE_COOKIE = 'oauth_state'
const STATE_TTL_SECONDS = 5 * 60

function base64UrlEncode(buffer: Buffer) {
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

function getSecret() {
  const secret = useRuntimeConfig().auth.emailVerifySecret as string
  if (!secret) {
    throw new Error('auth.emailVerifySecret is not configured')
  }
  return secret
}

function sign(payload: string) {
  return base64UrlEncode(createHmac('sha256', getSecret()).update(payload).digest())
}

export interface IssuedState {
  state: string
  nonce: string
}

export function issueState(event: H3Event, provider: string, returnTo: string): IssuedState {
  const nonce = base64UrlEncode(randomBytes(16))
  const returnToEncoded = base64UrlEncode(Buffer.from(returnTo || '/'))
  const payload = `${nonce}.${provider}.${returnToEncoded}`
  const sig = sign(payload)
  const cookieValue = `${payload}.${sig}`

  setCookie(event, STATE_COOKIE, cookieValue, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: STATE_TTL_SECONDS,
  })

  return { state: nonce, nonce }
}

export interface ConsumedState {
  nonce: string
  provider: string
  returnTo: string
}

export function consumeState(event: H3Event, provider: string, stateFromQuery: string | null | undefined): ConsumedState | null {
  const cookie = getCookie(event, STATE_COOKIE)
  clearStateCookie(event)
  if (!cookie || !stateFromQuery) {
    return null
  }

  const parts = cookie.split('.')
  if (parts.length !== 4) {
    return null
  }

  const nonce = parts[0]
  const cookieProvider = parts[1]
  const returnToEncoded = parts[2]
  const sig = parts[3]
  if (!nonce || !cookieProvider || !returnToEncoded || !sig) {
    return null
  }

  const expected = sign(`${nonce}.${cookieProvider}.${returnToEncoded}`)
  const sigBuffer = Buffer.from(sig)
  const expectedBuffer = Buffer.from(expected)
  if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
    return null
  }
  if (cookieProvider !== provider) {
    return null
  }

  const stateBuffer = Buffer.from(stateFromQuery)
  const nonceBuffer = Buffer.from(nonce)
  if (stateBuffer.length !== nonceBuffer.length || !timingSafeEqual(stateBuffer, nonceBuffer)) {
    return null
  }

  return {
    nonce,
    provider: cookieProvider,
    returnTo: base64UrlDecode(returnToEncoded).toString('utf8') || '/',
  }
}

export function clearStateCookie(event: H3Event) {
  setCookie(event, STATE_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

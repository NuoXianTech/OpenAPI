import type { H3Event } from 'h3'
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { getCookie, setCookie } from 'h3'
import { getAuthSecret } from '~~/server/utils/auth-secret'

const STATE_COOKIE = 'oauth_state'
const STATE_TTL_SECONDS = 5 * 60

export type OauthFlowMode = 'login' | 'bind'

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

function sign(payload: string) {
  return base64UrlEncode(createHmac('sha256', getAuthSecret()).update(payload).digest())
}

interface IssuedState {
  state: string
  nonce: string
}

export function issueState(event: H3Event, provider: string, returnTo: string, mode: OauthFlowMode = 'login'): IssuedState {
  const nonce = base64UrlEncode(randomBytes(16))
  const returnToEncoded = base64UrlEncode(Buffer.from(returnTo || '/'))
  const flowMode: OauthFlowMode = mode === 'bind' ? 'bind' : 'login'
  // payload: nonce.provider.returnTo.mode
  const payload = `${nonce}.${provider}.${returnToEncoded}.${flowMode}`
  const sig = sign(payload)
  const cookieValue = `${payload}.${sig}`

  setCookie(event, STATE_COOKIE, cookieValue, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: STATE_TTL_SECONDS
  })

  return { state: nonce, nonce }
}

interface ConsumedState {
  nonce: string
  provider: string
  returnTo: string
  mode: OauthFlowMode
}

export function consumeState(event: H3Event, provider: string, stateFromQuery: string | null | undefined): ConsumedState | null {
  const cookie = getCookie(event, STATE_COOKIE)
  clearStateCookie(event)
  if (!cookie || !stateFromQuery) {
    return null
  }

  const parts = cookie.split('.')
  if (parts.length !== 5) {
    return null
  }

  const [nonce, cookieProvider, returnToEncoded, cookieMode, sig] = parts
  if (!nonce || !cookieProvider || !returnToEncoded || !sig) {
    return null
  }
  if (cookieMode !== 'bind' && cookieMode !== 'login') {
    return null
  }

  const expected = sign(`${nonce}.${cookieProvider}.${returnToEncoded}.${cookieMode}`)
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
    mode: cookieMode
  }
}

function clearStateCookie(event: H3Event) {
  setCookie(event, STATE_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  })
}

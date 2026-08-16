import type { H3Event } from 'h3'
import { randomBytes } from 'node:crypto'
import { getCookie, setCookie } from 'h3'
import { getAuthSecret } from '~~/server/utils/auth-secret'
import { createHmacSignature, decodeBase64Url, encodeBase64Url, hasValidHmacSignature, isTimingSafeEqual } from '~~/server/utils/secure-token'
import { hostCookieName, hostCookieSecurityOptions } from '~~/server/utils/host-cookie'

const STATE_COOKIE = hostCookieName('oauth_state')
const STATE_TTL_SECONDS = 5 * 60

export type OauthFlowMode = 'login' | 'bind'

function sign(payload: string) {
  return createHmacSignature(payload, getAuthSecret())
}

interface IssuedState {
  state: string
  nonce: string
}

export function issueState(event: H3Event, provider: string, returnTo: string, mode: OauthFlowMode = 'login'): IssuedState {
  const nonce = encodeBase64Url(randomBytes(16))
  const returnToEncoded = encodeBase64Url(returnTo || '/')
  const flowMode: OauthFlowMode = mode === 'bind' ? 'bind' : 'login'
  const expiresAt = Math.floor(Date.now() / 1000) + STATE_TTL_SECONDS
  // payload: nonce.provider.returnTo.mode.expiresAt
  const payload = `${nonce}.${provider}.${returnToEncoded}.${flowMode}.${expiresAt}`
  const sig = sign(payload)
  const cookieValue = `${payload}.${sig}`

  setCookie(event, STATE_COOKIE, cookieValue, {
    httpOnly: true,
    sameSite: 'lax',
    ...hostCookieSecurityOptions(),
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
  if (parts.length !== 6) {
    return null
  }

  const [nonce, cookieProvider, returnToEncoded, cookieMode, expiresAtRaw, sig] = parts
  if (!nonce || !cookieProvider || !returnToEncoded || !expiresAtRaw || !sig) {
    return null
  }
  if (cookieMode !== 'bind' && cookieMode !== 'login') {
    return null
  }

  if (!hasValidHmacSignature(
    `${nonce}.${cookieProvider}.${returnToEncoded}.${cookieMode}.${expiresAtRaw}`,
    sig,
    getAuthSecret()
  )) {
    return null
  }
  if (cookieProvider !== provider) {
    return null
  }
  const expiresAt = Number(expiresAtRaw)
  if (!Number.isSafeInteger(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) return null

  if (!isTimingSafeEqual(stateFromQuery, nonce)) {
    return null
  }

  return {
    nonce,
    provider: cookieProvider,
    returnTo: decodeBase64Url(returnToEncoded).toString('utf8') || '/',
    mode: cookieMode
  }
}

function clearStateCookie(event: H3Event) {
  setCookie(event, STATE_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    ...hostCookieSecurityOptions(),
    maxAge: 0
  })
}

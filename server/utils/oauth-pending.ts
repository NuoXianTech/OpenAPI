import type { H3Event } from 'h3'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { getCookie, setCookie } from 'h3'
import type { SupportedOauthProvider } from '#shared/types/oauth'
import { getAuthSecret } from '~~/server/utils/auth-secret'
import { isSupportedOauthProvider } from '~~/server/utils/oauth-provider-id'

// ------------------------------------------------------------------
// 「待处理 OAuth 身份」载体
//
// OAuth 回调拿到已验证的三方 profile、但该身份尚未绑定任何本地用户时，
// 不再自动建号/自动按邮箱关联，而是把 profile 用 HMAC 签名后写进一个短时
// httpOnly cookie，跳转 /oauth/complete 让用户手动「绑定已有」或「新注册」。
//
// 与 access JWT / oauthState 一样用 auth.secret 做 HMAC，不落库、不建表。
// providerUserId 是稳定身份标识；email 仅作新注册表单的预填建议，真正注册
// 邮箱以用户在窗口填写并经校验/验证的为准。
// ------------------------------------------------------------------

const PENDING_COOKIE = 'oauth_pending'
const PENDING_TTL_SECONDS = 10 * 60

export interface PendingOauthProfile {
  provider: SupportedOauthProvider
  providerUserId: string
  email: string | null
  nickname: string | null
  avatarUrl: string | null
}

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

export function issuePendingOauth(event: H3Event, profile: PendingOauthProfile): void {
  const payload = base64UrlEncode(Buffer.from(JSON.stringify(profile), 'utf8'))
  const cookieValue = `${payload}.${sign(payload)}`
  setCookie(event, PENDING_COOKIE, cookieValue, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: PENDING_TTL_SECONDS
  })
}

/** 校验签名并解析待处理身份；签名不符 / 过期（cookie 自动失效）/ 缺失都返回 null。不消费 cookie。 */
export function readPendingOauth(event: H3Event): PendingOauthProfile | null {
  const cookie = getCookie(event, PENDING_COOKIE)
  if (!cookie) {
    return null
  }
  const dot = cookie.lastIndexOf('.')
  if (dot <= 0) {
    return null
  }
  const payload = cookie.slice(0, dot)
  const sig = cookie.slice(dot + 1)

  const sigBuffer = Buffer.from(sig)
  const expectedBuffer = Buffer.from(sign(payload))
  if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
    return null
  }

  try {
    const obj = JSON.parse(base64UrlDecode(payload).toString('utf8')) as Record<string, unknown>
    if (!obj || typeof obj !== 'object') {
      return null
    }
    if (!isSupportedOauthProvider(obj.provider) || typeof obj.providerUserId !== 'string' || !obj.providerUserId) {
      return null
    }
    return {
      provider: obj.provider,
      providerUserId: obj.providerUserId,
      email: typeof obj.email === 'string' ? obj.email : null,
      nickname: typeof obj.nickname === 'string' ? obj.nickname : null,
      avatarUrl: typeof obj.avatarUrl === 'string' ? obj.avatarUrl : null
    }
  } catch {
    return null
  }
}

export function clearPendingOauth(event: H3Event): void {
  setCookie(event, PENDING_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  })
}

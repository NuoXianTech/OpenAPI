import { createHmac, timingSafeEqual } from 'node:crypto'
import { getAuthSecret } from '~~/server/utils/auth-secret'

// ------------------------------------------------------------------
// 无状态邮箱类一次性 token（验证激活 / 密码重置 / 邮箱变更）
//
// 取代原 verification_tokens 表：token 自带 HMAC 签名、不落库、无需 GC。
// 「用完即废」不靠数据库标记，而是把「该操作成功后必然变化的用户字段」掺进
// 签名材料（binding）。消费时用当前用户字段重算签名：字段一旦变化，旧链接
// 验签自然失败：
//   - verify         binding=email；单次性由 usersService.activateUser 的
//                    WHERE emailVerifiedAt IS NULL 幂等保证（不重复赠分）
//   - reset_password binding=email + tokenVersion；重置后 bumpTokenVersion
//                    令 tokenVersion 变化 → 旧链接失效
//   - change_email   binding=当前(旧) email；确认后 updateEmail 改 email →
//                    旧链接失效（payload.email 存的是「新」邮箱）
//
// 与 access JWT / oauthState / oauthPending 一致，用 auth.secret 做 HMAC。
// ------------------------------------------------------------------

export type VerificationPurpose = 'verify' | 'reset_password' | 'change_email'

export interface VerificationTokenPayload {
  uid: number
  email: string // verify / reset_password：当前邮箱；change_email：新邮箱
  purpose: VerificationPurpose
  exp: number // 过期时刻（unix 秒）
}

interface BindingUser {
  email: string
  tokenVersion: number
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

// 把「操作成功后必变的字段」拼成 binding。purpose 前缀避免跨场景串用。
function bindingMaterial(purpose: VerificationPurpose, user: BindingUser): string {
  switch (purpose) {
    case 'verify':
      return `verify:${user.email}`
    case 'reset_password':
      return `reset_password:${user.email}:${user.tokenVersion}`
    case 'change_email':
      return `change_email:${user.email}`
  }
}

function sign(payloadB64: string, binding: string) {
  return base64UrlEncode(createHmac('sha256', getAuthSecret()).update(`${payloadB64}.${binding}`).digest())
}

/**
 * 签发无状态 token。`user` 提供 binding 所需字段（change_email 的 binding 取「旧」
 * 邮箱，故 user.email 必须是变更前的当前邮箱；新邮箱通过 opts.email 进 payload）。
 */
export function signVerificationToken(
  user: { id: number, email: string, tokenVersion: number },
  opts: { purpose: VerificationPurpose, email: string, expiresInMinutes: number }
): string {
  const exp = Math.floor(Date.now() / 1000) + opts.expiresInMinutes * 60
  const payload: VerificationTokenPayload = {
    uid: user.id,
    email: opts.email,
    purpose: opts.purpose,
    exp
  }
  const payloadB64 = base64UrlEncode(Buffer.from(JSON.stringify(payload), 'utf8'))
  return `${payloadB64}.${sign(payloadB64, bindingMaterial(opts.purpose, user))}`
}

/**
 * 校验并解析 token。`user` 为消费前的当前用户行（binding 用其字段重算签名）。
 * 签名不符 / purpose 不符 / 过期 / 结构异常一律返回 null（不抛错）。
 */
export function verifyVerificationToken(
  token: string,
  user: BindingUser,
  expectedPurpose: VerificationPurpose
): VerificationTokenPayload | null {
  if (!token) {
    return null
  }
  const dot = token.lastIndexOf('.')
  if (dot <= 0) {
    return null
  }
  const payloadB64 = token.slice(0, dot)
  const sig = token.slice(dot + 1)

  const sigBuffer = Buffer.from(sig)
  const expectedBuffer = Buffer.from(sign(payloadB64, bindingMaterial(expectedPurpose, user)))
  if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
    return null
  }

  let payload: VerificationTokenPayload
  try {
    payload = JSON.parse(base64UrlDecode(payloadB64).toString('utf8')) as VerificationTokenPayload
  } catch {
    return null
  }

  if (!payload || typeof payload !== 'object') {
    return null
  }
  if (payload.purpose !== expectedPurpose) {
    return null
  }
  if (typeof payload.uid !== 'number' || typeof payload.email !== 'string') {
    return null
  }
  if (typeof payload.exp !== 'number' || payload.exp <= Math.floor(Date.now() / 1000)) {
    return null
  }

  return payload
}

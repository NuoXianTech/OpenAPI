import { createHmac, timingSafeEqual } from 'node:crypto'
import { getAuthSecret } from '~~/server/utils/auth-secret'

// ------------------------------------------------------------------
// 会话 JWT（HS256，自签自验）
//
// 本项目会话完全由 JWT 承载，无服务端会话表。撤销靠 users.tokenVersion：
// JWT 内嵌签发时的 ver，鉴权时与 DB 当前 tokenVersion 比对；改密 / 重置 / 全局登出
// 时 version+1 即令所有旧 token 立即失效（见 server/utils/auth.ts、userService.bumpTokenVersion）。
//
// 手搓 HS256（node:crypto），无 jose / jsonwebtoken 依赖。
// 安全约束：算法硬编码 HS256（防 alg=none / 混淆）、timingSafeEqual 比签名、
// 强制校验 exp、secret 未配置 fail-closed（签发抛错 / 校验返回 null）。
// ------------------------------------------------------------------

export interface AccessTokenPayload {
  sub: number // users.id
  role: 'user' | 'admin'
  ver: number // 签发时的 users.tokenVersion
  loginAt: number // 首次登录的 unix 秒，用于绝对硬顶（滑动重签时透传）
  rmb: boolean // 记住我
}

// 校验返回值：payload + exp（供 auth.ts 计算剩余寿命做滑动重签）
export type VerifiedToken = AccessTokenPayload & { exp: number }

interface JwtClaims extends AccessTokenPayload {
  iat: number
  exp: number
}

const ALG = 'HS256'

function computeSignature(signingInput: string, secret: string) {
  return createHmac('sha256', secret).update(signingInput).digest('base64url')
}

export function signAccessToken(payload: AccessTokenPayload, ttlSeconds: number) {
  const secret = getAuthSecret()
  const now = Math.floor(Date.now() / 1000)
  const claims: JwtClaims = {
    ...payload,
    iat: now,
    exp: now + ttlSeconds
  }
  const header = Buffer.from(JSON.stringify({ alg: ALG, typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify(claims)).toString('base64url')
  const signingInput = `${header}.${body}`
  return `${signingInput}.${computeSignature(signingInput, secret)}`
}

export function verifyAccessToken(token: string): VerifiedToken | null {
  let secret: string
  try {
    secret = getAuthSecret()
  } catch {
    return null // secret 缺失 → fail-closed
  }

  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [header, body, signature] = parts
  if (!header || !body || !signature) return null

  // 1) header.alg 必须是 HS256，拒绝 alg=none / 算法混淆
  let alg: unknown
  try {
    alg = (JSON.parse(Buffer.from(header, 'base64url').toString('utf8')) as { alg?: unknown }).alg
  } catch {
    return null
  }
  if (alg !== ALG) return null

  // 2) 常量时间比对签名
  const expected = computeSignature(`${header}.${body}`, secret)
  const expectedBuf = Buffer.from(expected)
  const actualBuf = Buffer.from(signature)
  if (expectedBuf.length !== actualBuf.length) return null
  if (!timingSafeEqual(expectedBuf, actualBuf)) return null

  // 3) 解析 claims + 严格校验 exp / role
  let claims: JwtClaims
  try {
    claims = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  } catch {
    return null
  }
  if (typeof claims.exp !== 'number' || claims.exp <= Math.floor(Date.now() / 1000)) {
    return null
  }
  if (!Number.isInteger(claims.sub) || claims.sub <= 0) return null
  if (claims.role !== 'user' && claims.role !== 'admin') return null

  return claims
}

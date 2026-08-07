import { randomBytes, scrypt as scryptCallback } from 'node:crypto'
import type { BinaryLike, ScryptOptions } from 'node:crypto'
import { promisify } from 'node:util'
import { decodeBase64Url, encodeBase64Url, isTimingSafeEqual } from './secure-token'

const SALT_BYTES = 16
const KEY_LENGTH = 64
const SCRYPT_DEFAULTS = { N: 16384, r: 8, p: 1 } as const
const MAX_SCRYPT_N = 1 << 20
const MAX_SCRYPT_R = 32
const MAX_SCRYPT_P = 16

const scrypt = promisify(scryptCallback) as (
  password: BinaryLike,
  salt: BinaryLike,
  keylen: number,
  options?: ScryptOptions
) => Promise<Buffer>

function scryptOptions(params: { N: number, r: number, p: number }) {
  const { N, r, p } = params
  const memNeeded = 128 * N * r + 128 * r * p
  return { N, r, p, maxmem: Math.max(memNeeded * 2, 32 << 20) }
}

function formatScryptParams(params: { N: number, r: number, p: number }): string {
  return `N=${params.N},r=${params.r},p=${params.p}`
}

function parseScryptParams(spec: string): { N: number, r: number, p: number } | null {
  const result: Partial<{ N: number, r: number, p: number }> = {}
  for (const entry of spec.split(',')) {
    const [key, value] = entry.split('=')
    if (!key || !value) return null
    const number = Number(value)
    if (!Number.isSafeInteger(number) || number <= 0) return null
    if (key === 'N') result.N = number
    else if (key === 'r') result.r = number
    else if (key === 'p') result.p = number
    else return null
  }
  if (
    !result.N
    || !result.r
    || !result.p
    || (result.N & (result.N - 1)) !== 0
    || result.N > MAX_SCRYPT_N
    || result.r > MAX_SCRYPT_R
    || result.p > MAX_SCRYPT_P
  ) return null
  return result as { N: number, r: number, p: number }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES)
  const derived = await scrypt(password, salt, KEY_LENGTH, scryptOptions(SCRYPT_DEFAULTS)) as Buffer
  return `scrypt$${formatScryptParams(SCRYPT_DEFAULTS)}$${encodeBase64Url(salt)}$${encodeBase64Url(derived)}`
}

export async function verifyPassword(stored: string, password: string): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 4 || parts[0] !== 'scrypt') return false

  const params = parseScryptParams(parts[1] ?? '')
  if (!params || !parts[2] || !parts[3]) return false

  try {
    const salt = decodeBase64Url(parts[2])
    const hash = decodeBase64Url(parts[3])
    if (salt.length === 0 || hash.length === 0 || hash.length > 256) return false
    const derived = await scrypt(password, salt, hash.length, scryptOptions(params)) as Buffer
    return isTimingSafeEqual(hash, derived)
  } catch {
    return false
  }
}

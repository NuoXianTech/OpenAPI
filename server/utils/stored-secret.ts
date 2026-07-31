import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto'
import { decodeBase64Url } from '~~/server/utils/secure-token'

const SECRET_BYTES = 32
const ENCRYPTION_VERSION = 'v1'

export type StoredSecretDomain = 'api-key' | 'redemption-code'

let cachedApiKeySecret: Buffer | null = null

function parseApiKeySecret(raw: string): Buffer {
  if (!raw) {
    throw new Error('NUXT_API_KEY_SECRET is required')
  }
  if (/^[0-9a-fA-F]+$/.test(raw) && raw.length === SECRET_BYTES * 2) {
    return Buffer.from(raw, 'hex')
  }
  const decoded = decodeBase64Url(raw)
  if (decoded.length === SECRET_BYTES) {
    return decoded
  }
  const utf8 = Buffer.from(raw, 'utf8')
  if (utf8.length === SECRET_BYTES) {
    return utf8
  }
  throw new Error(`NUXT_API_KEY_SECRET must be ${SECRET_BYTES} bytes (hex / base64url / utf-8)`)
}

export function getApiKeySecret(): Buffer {
  if (cachedApiKeySecret) return cachedApiKeySecret
  const raw = useRuntimeConfig().apiKeySecret as string
  cachedApiKeySecret = parseApiKeySecret(raw)
  return cachedApiKeySecret
}

export function assertApiKeySecretConfigured(): void {
  getApiKeySecret()
}

function deriveKey(domain: StoredSecretDomain, purpose: 'encrypt' | 'lookup'): Buffer {
  return createHmac('sha256', getApiKeySecret())
    .update(`openapi:${domain}:${purpose}:${ENCRYPTION_VERSION}`)
    .digest()
}

function encryptedPrefix(domain: StoredSecretDomain): string {
  return `enc:${domain}:${ENCRYPTION_VERSION}:`
}

export function digestStoredSecret(value: string, domain: StoredSecretDomain): string {
  return createHmac('sha256', deriveKey(domain, 'lookup'))
    .update(value, 'utf8')
    .digest('hex')
}

export function encryptStoredSecret(value: string, domain: StoredSecretDomain): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', deriveKey(domain, 'encrypt'), iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const payload = Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url')
  return `${encryptedPrefix(domain)}${payload}`
}

export function decryptStoredSecret(value: string, domain: StoredSecretDomain): string {
  const prefix = encryptedPrefix(domain)
  if (!value.startsWith(prefix)) {
    throw new Error('数据库敏感凭据不是受支持的密文格式')
  }

  const payload = Buffer.from(value.slice(prefix.length), 'base64url')
  if (payload.length < 29) {
    throw new Error('数据库敏感凭据密文不完整')
  }

  const iv = payload.subarray(0, 12)
  const authTag = payload.subarray(12, 28)
  const encrypted = payload.subarray(28)
  const decipher = createDecipheriv('aes-256-gcm', deriveKey(domain, 'encrypt'), iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

export function createStoredSecretPreview(value: string): string {
  if (value.length <= 8) return `${value.slice(0, 2)}••••${value.slice(-2)}`
  return `${value.slice(0, 6)}••••${value.slice(-4)}`
}

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { getApiKeySecret } from '~~/server/utils/stored-secret'

const ENCRYPTED_VALUE_PREFIX = 'enc:system-setting:v2:'

function createEncryptionKey(secret: Buffer | string): Buffer {
  return createHash('sha256')
    .update('openapi:system-settings:')
    .update(secret)
    .digest()
}

function decryptValue(value: string, prefix: string, secret: Buffer | string): string {
  const payload = Buffer.from(value.slice(prefix.length), 'base64url')
  if (payload.length < 29) throw new Error('系统敏感配置密文不完整')

  const iv = payload.subarray(0, 12)
  const authTag = payload.subarray(12, 28)
  const encrypted = payload.subarray(28)
  const decipher = createDecipheriv('aes-256-gcm', createEncryptionKey(secret), iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

export function encodeSystemSettingSecret(value: string): string {
  if (!value) return value

  const iv = randomBytes(12)
  // Session signing and data-at-rest encryption have independent lifecycles.
  // The API-key root is already the Platform data-encryption root and is
  // domain-separated here; rotating the auth signing secret no longer makes
  // SMTP/OAuth/Turnstile settings unreadable.
  const cipher = createCipheriv('aes-256-gcm', createEncryptionKey(getApiKeySecret()), iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const payload = Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url')
  return `${ENCRYPTED_VALUE_PREFIX}${payload}`
}

export function decodeSystemSettingSecret(value: string): string {
  if (!value) return ''
  if (value.startsWith(ENCRYPTED_VALUE_PREFIX)) {
    return decryptValue(value, ENCRYPTED_VALUE_PREFIX, getApiKeySecret())
  }
  throw new Error('系统敏感配置不是受支持的密文格式')
}

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { getAuthSecret } from '~~/server/utils/auth-secret'

const ENCRYPTED_VALUE_PREFIX = 'enc:system-setting:v1:'

function createEncryptionKey(): Buffer {
  return createHash('sha256')
    .update('openapi:system-settings:')
    .update(getAuthSecret())
    .digest()
}

export function encodeSystemSettingSecret(value: string): string {
  if (!value) return value

  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', createEncryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const payload = Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url')
  return `${ENCRYPTED_VALUE_PREFIX}${payload}`
}

export function decodeSystemSettingSecret(value: string): string {
  if (!value) return ''
  if (!value.startsWith(ENCRYPTED_VALUE_PREFIX)) {
    throw new Error('系统敏感配置不是受支持的密文格式')
  }

  const payload = Buffer.from(value.slice(ENCRYPTED_VALUE_PREFIX.length), 'base64url')
  if (payload.length < 29) throw new Error('系统敏感配置密文不完整')

  const iv = payload.subarray(0, 12)
  const authTag = payload.subarray(12, 28)
  const encrypted = payload.subarray(28)
  const decipher = createDecipheriv('aes-256-gcm', createEncryptionKey(), iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGO = 'aes-256-gcm'
const IV_LENGTH = 12
const TAG_LENGTH = 16
const KEY_LENGTH = 32
const CIPHER_PREFIX = 'gcm$'

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

function parseKey(raw: string): Buffer {
  if (!raw) {
    throw new Error('OAUTH_SECRET_KEY is not configured')
  }

  if (/^[0-9a-fA-F]+$/.test(raw) && raw.length === KEY_LENGTH * 2) {
    return Buffer.from(raw, 'hex')
  }

  const decoded = base64UrlDecode(raw)
  if (decoded.length === KEY_LENGTH) {
    return decoded
  }

  const utf8 = Buffer.from(raw, 'utf8')
  if (utf8.length === KEY_LENGTH) {
    return utf8
  }

  throw new Error(`OAUTH_SECRET_KEY must be ${KEY_LENGTH} bytes (hex / base64url / utf-8)`)
}

let cachedKey: Buffer | null = null

function getKey() {
  if (cachedKey) {
    return cachedKey
  }
  const raw = useRuntimeConfig().auth.oauthSecretKey as string
  cachedKey = parseKey(raw)
  return cachedKey
}

export function encryptSecret(plain: string): string {
  if (!plain) {
    return ''
  }
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGO, key, iv)
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${CIPHER_PREFIX}${base64UrlEncode(iv)}$${base64UrlEncode(tag)}$${base64UrlEncode(encrypted)}`
}

export function decryptSecret(cipherText: string): string {
  if (!cipherText) {
    return ''
  }
  if (!cipherText.startsWith(CIPHER_PREFIX)) {
    throw new Error('invalid oauth cipher format')
  }
  const [, ivPart, tagPart, dataPart] = cipherText.split('$')
  if (!ivPart || !tagPart || !dataPart) {
    throw new Error('invalid oauth cipher payload')
  }

  const iv = base64UrlDecode(ivPart)
  const tag = base64UrlDecode(tagPart)
  const data = base64UrlDecode(dataPart)
  if (iv.length !== IV_LENGTH || tag.length !== TAG_LENGTH) {
    throw new Error('invalid oauth cipher iv/tag')
  }

  const decipher = createDecipheriv(ALGO, getKey(), iv)
  decipher.setAuthTag(tag)
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()])
  return decrypted.toString('utf8')
}

export const SECRET_MASK = '***'

export function maskSecret(_cipher: string | null | undefined): string {
  return SECRET_MASK
}

export function isSecretMask(value: string | null | undefined): boolean {
  return !value || value === SECRET_MASK
}

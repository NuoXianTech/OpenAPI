import { createHmac, randomBytes } from 'node:crypto'
import { and, eq, sql } from 'drizzle-orm'
import { apiKeys } from '@nuxthub/db/schema'

const SECRET_BYTES = 32

function base64UrlDecode(input: string) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  return Buffer.from(padded, 'base64')
}

function parseSecret(raw: string): Buffer {
  if (!raw) {
    throw new Error('API_KEY_SECRET is not configured')
  }
  if (/^[0-9a-fA-F]+$/.test(raw) && raw.length === SECRET_BYTES * 2) {
    return Buffer.from(raw, 'hex')
  }
  const decoded = base64UrlDecode(raw)
  if (decoded.length === SECRET_BYTES) {
    return decoded
  }
  const utf8 = Buffer.from(raw, 'utf8')
  if (utf8.length === SECRET_BYTES) {
    return utf8
  }
  throw new Error(`API_KEY_SECRET must be ${SECRET_BYTES} bytes (hex / base64url / utf-8)`)
}

let cachedSecret: Buffer | null = null

function getSecret() {
  if (cachedSecret) return cachedSecret
  const raw = useRuntimeConfig().auth.apiKeySecret as string
  cachedSecret = parseSecret(raw)
  return cachedSecret
}

function generateApiKey() {
  const nonce = randomBytes(24)
  return createHmac('sha256', getSecret()).update(nonce).digest('base64url')
}

export const apiKeyService = {
  async getByApiKey(apiKey: string) {
    const res = await db.select().from(apiKeys).where(eq(apiKeys.apiKey, apiKey)).limit(1)
    return res[0] || null
  },

  async listByUser(userId: number) {
    return db.select().from(apiKeys).where(eq(apiKeys.userId, userId))
  },

  async listAll() {
    return db.select().from(apiKeys)
  },

  async createForUser(userId: number, name: string) {
    const key = generateApiKey()
    const res = await db.insert(apiKeys)
      .values({
        userId,
        name,
        apiKey: key,
        isActive: true
      })
      .returning()
    return res[0]
  },

  async deleteForUser(userId: number, id: number) {
    const res = await db.delete(apiKeys)
      .where(and(eq(apiKeys.userId, userId), eq(apiKeys.id, id)))
      .returning()
    return res[0] || null
  },

  async deleteById(id: number) {
    const res = await db.delete(apiKeys)
      .where(eq(apiKeys.id, id))
      .returning()
    return res[0] || null
  },

  async resetForUser(userId: number, id: number) {
    const nextKey = generateApiKey()
    const res = await db.update(apiKeys)
      .set({ apiKey: nextKey })
      .where(and(eq(apiKeys.userId, userId), eq(apiKeys.id, id)))
      .returning()
    return res[0] || null
  },

  async resetById(id: number) {
    const nextKey = generateApiKey()
    const res = await db.update(apiKeys)
      .set({
        apiKey: nextKey
      })
      .where(eq(apiKeys.id, id))
      .returning()
    return res[0] || null
  },

  /**
   * 记录一次使用：更新 lastUsedAt/lastUsedIp 并累加 totalCalls。
   * 调用方（middleware）应 fire-and-forget，失败不影响业务。
   */
  async recordUsage(id: number, ip: string | null) {
    await db.update(apiKeys)
      .set({
        lastUsedAt: new Date(),
        lastUsedIp: ip,
        totalCalls: sql`${apiKeys.totalCalls} + 1`
      })
      .where(eq(apiKeys.id, id))
  }
}

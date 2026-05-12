import { randomBytes } from 'node:crypto'
import { and, eq, sql } from 'drizzle-orm'
import { apiKeys } from '@nuxthub/db/schema'

function generateApiKey() {
  return `opk_${randomBytes(24).toString('base64url')}`
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

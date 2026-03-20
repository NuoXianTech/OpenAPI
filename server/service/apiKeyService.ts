import { randomBytes } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { apiKeys } from '@nuxthub/db/schema'

function generateApiKey() {
  return `opk_${randomBytes(24).toString('base64url')}`
}

export const apiKeyService = {
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
        isActive: true,
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
      .set({
        apiKey: nextKey,
        updatedAt: new Date(),
      })
      .where(and(eq(apiKeys.userId, userId), eq(apiKeys.id, id)))
      .returning()
    return res[0] || null
  },

  async resetById(id: number) {
    const nextKey = generateApiKey()
    const res = await db.update(apiKeys)
      .set({
        apiKey: nextKey,
        updatedAt: new Date(),
      })
      .where(eq(apiKeys.id, id))
      .returning()
    return res[0] || null
  },
}

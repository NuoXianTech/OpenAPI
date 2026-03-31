import { desc, eq } from 'drizzle-orm'
import { friendLinks } from '@nuxthub/db/schema'

export const friendLinkService = {
  async list() {
    return db.select().from(friendLinks).orderBy(desc(friendLinks.updatedAt))
  },

  async listPublic() {
    return db.select()
      .from(friendLinks)
      .where(eq(friendLinks.isActive, true))
      .orderBy(desc(friendLinks.updatedAt))
  },

  async getById(id: number) {
    const res = await db.select().from(friendLinks).where(eq(friendLinks.id, id)).limit(1)
    return res[0] || null
  },

  async create(data: {
    title: string
    url: string
    description?: string | null
    isActive?: boolean
    createdBy?: number | null
  }) {
    const res = await db.insert(friendLinks).values({
      title: data.title,
      url: data.url,
      description: data.description ?? null,
      isActive: data.isActive ?? true,
      createdBy: data.createdBy ?? null,
    }).returning()
    return res[0]
  },

  async update(id: number, data: Partial<{
    title: string
    url: string
    description: string | null
    isActive: boolean
  }>) {
    const res = await db.update(friendLinks)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(friendLinks.id, id))
      .returning()
    return res[0] || null
  },

  async delete(id: number) {
    const res = await db.delete(friendLinks).where(eq(friendLinks.id, id)).returning()
    return res[0] || null
  },
}

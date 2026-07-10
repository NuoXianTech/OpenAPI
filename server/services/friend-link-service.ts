import { desc, eq } from 'drizzle-orm'
import { friendLinks } from '~~/server/db/schema'
import { expectFirstRow, firstRow } from '~~/server/utils/row'

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
      createdBy: data.createdBy ?? null
    }).returning()
    return expectFirstRow(res, 'Failed to create friend link.')
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
        updatedAt: new Date()
      })
      .where(eq(friendLinks.id, id))
      .returning()
    return firstRow(res)
  },

  async delete(id: number) {
    const res = await db.delete(friendLinks).where(eq(friendLinks.id, id)).returning()
    return firstRow(res)
  }
}

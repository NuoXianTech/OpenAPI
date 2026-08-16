import { desc, eq } from 'drizzle-orm'
import { db } from '~~/server/db/client'
import { friendLinks } from '~~/server/db/schema'
import type { FriendLinkItem } from '#shared/types/content'
import { deleteSharedCache, getSharedCache } from '~~/server/utils/shared-cache'
import { expectFirstRow, firstRow } from '~~/server/utils/row'

const PUBLIC_FRIEND_LINKS_CACHE_KEY = 'cache:public:friend-links'
const PUBLIC_FRIEND_LINKS_TTL_SECONDS = 60

function invalidatePublicFriendLinks(): Promise<void> {
  return deleteSharedCache([PUBLIC_FRIEND_LINKS_CACHE_KEY])
}

export const friendLinkService = {
  async list() {
    return db.select().from(friendLinks).orderBy(desc(friendLinks.updatedAt))
  },

  async listPublic(): Promise<FriendLinkItem[]> {
    return getSharedCache<FriendLinkItem[]>({
      key: PUBLIC_FRIEND_LINKS_CACHE_KEY,
      ttlSeconds: PUBLIC_FRIEND_LINKS_TTL_SECONDS,
      async loader() {
        const rows = await db.select()
          .from(friendLinks)
          .where(eq(friendLinks.isActive, true))
          .orderBy(desc(friendLinks.updatedAt))

        return rows.map(row => ({
          id: row.id,
          title: row.title,
          url: row.url,
          description: row.description,
          isActive: row.isActive
        }))
      }
    })
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
    const created = expectFirstRow(res, 'Failed to create friend link.')
    await invalidatePublicFriendLinks()
    return created
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
    const updated = firstRow(res)
    if (updated) await invalidatePublicFriendLinks()
    return updated
  },

  async delete(id: number) {
    const res = await db.delete(friendLinks).where(eq(friendLinks.id, id)).returning()
    const deleted = firstRow(res)
    if (deleted) await invalidatePublicFriendLinks()
    return deleted
  }
}

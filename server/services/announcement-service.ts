import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm'
import { announcements } from '@nuxthub/db/schema'

export interface AnnouncementInput {
  title: string
  content: string
  level?: 'info' | 'success' | 'warning' | 'critical'
  isPinned?: boolean
  isEnabled?: boolean
  linkUrl?: string | null
  sortOrder?: number
}

export const announcementService = {
  async listAll() {
    return db.select().from(announcements)
      .where(isNull(announcements.deletedAt))
      .orderBy(desc(announcements.isPinned), asc(announcements.sortOrder), desc(announcements.createdAt))
  },

  /** 前台公告：生效中（未删除 + isEnabled） */
  async listPublic() {
    return db.select().from(announcements)
      .where(and(
        isNull(announcements.deletedAt),
        eq(announcements.isEnabled, true)
      ))
      .orderBy(desc(announcements.isPinned), asc(announcements.sortOrder), desc(announcements.createdAt))
  },

  async getById(id: number) {
    const res = await db.select().from(announcements).where(eq(announcements.id, id)).limit(1)
    return res[0] || null
  },

  async create(input: AnnouncementInput, actorUserId: number | null) {
    const res = await db.insert(announcements).values({
      title: input.title.trim(),
      content: input.content,
      level: input.level || 'info',
      isPinned: input.isPinned ?? false,
      isEnabled: input.isEnabled ?? true,
      linkUrl: input.linkUrl ?? null,
      sortOrder: input.sortOrder ?? 0,
      createdBy: actorUserId,
      updatedBy: actorUserId
    }).returning()
    return res[0]
  },

  async update(id: number, patch: Partial<AnnouncementInput>, actorUserId: number | null) {
    const setClause: Record<string, unknown> = { ...patch, updatedAt: new Date() }
    if (actorUserId !== undefined) {
      setClause.updatedBy = actorUserId
    }

    const res = await db.update(announcements)
      .set(setClause)
      .where(eq(announcements.id, id))
      .returning()
    return res[0] || null
  },

  async softDelete(id: number) {
    const res = await db.update(announcements)
      .set({ deletedAt: new Date(), isEnabled: false, updatedAt: new Date() })
      .where(eq(announcements.id, id))
      .returning()
    return res[0] || null
  },

  async bumpSort(id: number, direction: 'up' | 'down') {
    const delta = direction === 'up' ? -1 : 1
    await db.update(announcements)
      .set({ sortOrder: sql`${announcements.sortOrder} + ${delta}`, updatedAt: new Date() })
      .where(eq(announcements.id, id))
  }
}

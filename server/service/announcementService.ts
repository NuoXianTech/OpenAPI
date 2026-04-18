import { and, asc, desc, eq, gt, isNull, lt, or, sql } from 'drizzle-orm'
import { announcements } from '@nuxthub/db/schema'

export interface AnnouncementInput {
  title: string
  content: string
  level?: 'info' | 'success' | 'warning' | 'critical'
  isPinned?: boolean
  isEnabled?: boolean
  startAt?: Date | null
  endAt?: Date | null
  linkUrl?: string | null
  sortOrder?: number
}

export const announcementService = {
  async listAll() {
    return db.select().from(announcements)
      .where(isNull(announcements.deletedAt))
      .orderBy(desc(announcements.isPinned), asc(announcements.sortOrder), desc(announcements.createdAt))
  },

  /** 前台公告：生效中（isEnabled + 当前时间落在 startAt/endAt 窗口内） */
  async listPublic() {
    const now = new Date()
    return db.select().from(announcements)
      .where(and(
        isNull(announcements.deletedAt),
        eq(announcements.isEnabled, true),
        or(isNull(announcements.startAt), lt(announcements.startAt, now)),
        or(isNull(announcements.endAt), gt(announcements.endAt, now)),
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
      startAt: input.startAt ?? null,
      endAt: input.endAt ?? null,
      linkUrl: input.linkUrl ?? null,
      sortOrder: input.sortOrder ?? 0,
      createdBy: actorUserId,
      updatedBy: actorUserId,
    }).returning()
    return res[0]
  },

  async update(id: number, patch: Partial<AnnouncementInput>, actorUserId: number | null) {
    const setClause: Record<string, unknown> = { ...patch, updatedAt: new Date() }
    if (actorUserId !== undefined) {
      setClause.updatedBy = actorUserId
    }
    // drizzle 要 Date 类型传入；避免字符串意外通过
    if (patch.startAt !== undefined) setClause.startAt = patch.startAt
    if (patch.endAt !== undefined) setClause.endAt = patch.endAt

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
  },
}

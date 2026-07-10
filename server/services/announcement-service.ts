import { and, asc, desc, eq, isNull } from 'drizzle-orm'
import { announcements } from '~~/server/db/schema'
import {
  MESSAGE_LEVELS,
  type Announcement,
  type MessageLevel
} from '#shared/types/content'
import { deleteSharedCache, getSharedCache } from '~~/server/utils/shared-cache'
import { firstRow } from '~~/server/utils/row'

const PUBLIC_ANNOUNCEMENTS_CACHE_KEY = 'cache:public:announcements'
const PUBLIC_ANNOUNCEMENTS_TTL_SECONDS = 45

function invalidatePublicAnnouncements(): Promise<void> {
  return deleteSharedCache([PUBLIC_ANNOUNCEMENTS_CACHE_KEY])
}

function normalizeMessageLevel(value: string): MessageLevel {
  return MESSAGE_LEVELS.includes(value as MessageLevel) ? value as MessageLevel : 'info'
}

export interface AnnouncementInput {
  title: string
  content: string
  level?: MessageLevel
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
  async listPublic(): Promise<Announcement[]> {
    return getSharedCache<Announcement[]>({
      key: PUBLIC_ANNOUNCEMENTS_CACHE_KEY,
      ttlSeconds: PUBLIC_ANNOUNCEMENTS_TTL_SECONDS,
      async loader() {
        const rows = await db.select().from(announcements)
          .where(and(
            isNull(announcements.deletedAt),
            eq(announcements.isEnabled, true)
          ))
          .orderBy(desc(announcements.isPinned), asc(announcements.sortOrder), desc(announcements.createdAt))

        return rows.map(row => ({
          id: row.id,
          title: row.title,
          content: row.content,
          level: normalizeMessageLevel(row.level),
          isPinned: row.isPinned,
          isEnabled: row.isEnabled,
          linkUrl: row.linkUrl,
          sortOrder: row.sortOrder,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString()
        }))
      }
    })
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
    const created = res[0]
    if (created) await invalidatePublicAnnouncements()
    return created
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
    const updated = firstRow(res)
    if (updated) await invalidatePublicAnnouncements()
    return updated
  },

  async softDelete(id: number) {
    const res = await db.update(announcements)
      .set({ deletedAt: new Date(), isEnabled: false, updatedAt: new Date() })
      .where(eq(announcements.id, id))
      .returning()
    const deleted = firstRow(res)
    if (deleted) await invalidatePublicAnnouncements()
    return deleted
  }
}

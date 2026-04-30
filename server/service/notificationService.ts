import { and, count, desc, eq, inArray, isNull } from 'drizzle-orm'
import { notifications, users } from '@nuxthub/db/schema'
import { randomUUID } from 'node:crypto'

export type NotificationLevel = 'info' | 'success' | 'warning' | 'critical'

export interface SendNotificationInput {
  recipientUserIds: number[]
  title: string
  content: string
  level?: NotificationLevel
  linkUrl?: string | null
  senderUserId?: number | null
  senderActor?: string | null
}

export const notificationService = {
  /**
   * 群发：按 userIds 展开为多条记录，所有记录共用同一 batchId 便于 admin 聚合查看。
   * "广播全部活跃用户"由调用方先查 users 列表再传 ids。
   */
  async send(input: SendNotificationInput) {
    if (input.recipientUserIds.length === 0) return { batchId: null, inserted: 0 }
    const batchId = randomUUID()
    const rows = input.recipientUserIds.map(uid => ({
      batchId,
      recipientUserId: uid,
      senderUserId: input.senderUserId ?? null,
      senderActor: input.senderActor ?? null,
      title: input.title,
      content: input.content,
      level: input.level || 'info',
      linkUrl: input.linkUrl ?? null,
    }))
    const inserted = await db.insert(notifications).values(rows).returning({ id: notifications.id })
    return { batchId, inserted: inserted.length }
  },

  async listForUser(userId: number, opts: { limit?: number, offset?: number, onlyUnread?: boolean } = {}) {
    const limit = Math.min(Math.max(Math.trunc(opts.limit ?? 50), 1), 200)
    const offset = Math.max(Math.trunc(opts.offset ?? 0), 0)
    const conds = [
      eq(notifications.recipientUserId, userId),
      isNull(notifications.deletedAt),
    ]
    if (opts.onlyUnread) conds.push(eq(notifications.isRead, false))
    return db.select().from(notifications)
      .where(and(...conds))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset)
  },

  async unreadCountForUser(userId: number) {
    const rows = await db.select({ value: count() }).from(notifications)
      .where(and(
        eq(notifications.recipientUserId, userId),
        eq(notifications.isRead, false),
        isNull(notifications.deletedAt),
      ))
    return Number(rows[0]?.value || 0)
  },

  async markRead(userId: number, id: number) {
    const res = await db.update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(
        eq(notifications.id, id),
        eq(notifications.recipientUserId, userId),
        eq(notifications.isRead, false),
      ))
      .returning()
    return res[0] || null
  },

  async markAllRead(userId: number) {
    const res = await db.update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(
        eq(notifications.recipientUserId, userId),
        eq(notifications.isRead, false),
        isNull(notifications.deletedAt),
      ))
      .returning({ id: notifications.id })
    return res.length
  },

  async softDelete(userId: number, id: number) {
    const res = await db.update(notifications)
      .set({ deletedAt: new Date() })
      .where(and(
        eq(notifications.id, id),
        eq(notifications.recipientUserId, userId),
      ))
      .returning()
    return res[0] || null
  },

  /**
   * Admin 聚合视图：按 batchId 分组，便于查看群发批次。
   * 没有 batchId 的（旧/异常数据）按单条返回。
   */
  async listBatchesForAdmin(opts: { limit?: number, offset?: number } = {}) {
    const limit = Math.min(Math.max(Math.trunc(opts.limit ?? 50), 1), 200)
    const offset = Math.max(Math.trunc(opts.offset ?? 0), 0)
    // 取每个 batch 的代表行（最早一条）+ 总数 + 已读数
    const rows = await db.select({
      batchId: notifications.batchId,
      title: notifications.title,
      level: notifications.level,
      senderActor: notifications.senderActor,
      createdAt: notifications.createdAt,
      total: count(notifications.id),
    })
      .from(notifications)
      .where(isNull(notifications.deletedAt))
      .groupBy(notifications.batchId, notifications.title, notifications.level, notifications.senderActor, notifications.createdAt)
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset)
    return rows
  },

  async getBatchDetail(batchId: string) {
    const rows = await db.select({
      id: notifications.id,
      recipientUserId: notifications.recipientUserId,
      recipientUsername: users.username,
      isRead: notifications.isRead,
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
    })
      .from(notifications)
      .leftJoin(users, eq(users.id, notifications.recipientUserId))
      .where(and(eq(notifications.batchId, batchId), isNull(notifications.deletedAt)))
      .orderBy(desc(notifications.createdAt))
    return rows
  },

  /** 给定 userIds 列表，过滤出实际存在且未被软删的用户 id */
  async filterValidUserIds(userIds: number[]) {
    if (userIds.length === 0) return []
    const rows = await db.select({ id: users.id }).from(users)
      .where(and(inArray(users.id, userIds), isNull(users.deletedAt)))
    return rows.map(r => r.id)
  },
}

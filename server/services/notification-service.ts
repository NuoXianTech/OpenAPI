import { and, count, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { notificationDeliveries, notificationMessages, users } from '@nuxthub/db/schema'
import { toNumber } from '~~/server/utils/number'
import { normalizePagination } from '~~/server/utils/pagination'
import { firstRow } from '~~/server/utils/row'

// 用户表已是硬删模型，listActiveUserIds / send 不再需要过滤 deletedAt

export type NotificationLevel = 'info' | 'success' | 'warning' | 'critical'
export type NotificationAudience = 'specific' | 'all_current' | 'all_with_future'

export interface SendNotificationInput {
  title: string
  content: string
  level?: NotificationLevel
  linkUrl?: string | null
  audience: NotificationAudience
  /** audience='specific' 时必填；其他值忽略 */
  recipientUserIds?: number[]
  senderUserId?: number | null
  senderActor?: string | null
}

async function listActiveUserIds(): Promise<number[]> {
  const rows = await db.select({ id: users.id }).from(users)
    .where(and(
      eq(users.isActive, true),
      eq(users.isBanned, false)
    ))
  return rows.map((r: { id: number }) => r.id)
}

export const notificationService = {
  /**
   * 创建一条 message + 立即投递。
   * 'specific' 仅给传入 ids；'all_current' / 'all_with_future' 立刻 fan-out 到全部活跃用户；
   * 'all_with_future' 还会被 userService.activateUser 在新用户激活时补发（见下面 fanOutFutureMessagesTo）。
   */
  async send(input: SendNotificationInput) {
    let recipientIds: number[]
    if (input.audience === 'specific') {
      const ids = Array.from(new Set((input.recipientUserIds || []).map(Number).filter(n => Number.isFinite(n) && n > 0)))
      if (ids.length === 0) throw new Error('specific audience requires recipientUserIds')
      // 过滤为实际存在的 users（用户硬删后该 id 已无对应行）
      const valid = await db.select({ id: users.id }).from(users)
        .where(inArray(users.id, ids))
      recipientIds = valid.map((r: { id: number }) => r.id)
    } else {
      recipientIds = await listActiveUserIds()
    }

    const inserted = await db.insert(notificationMessages).values({
      title: input.title,
      content: input.content,
      level: input.level || 'info',
      linkUrl: input.linkUrl ?? null,
      audience: input.audience,
      recipientCount: recipientIds.length,
      senderUserId: input.senderUserId ?? null,
      senderActor: input.senderActor ?? null
    }).returning()
    const message = inserted[0]
    if (!message) throw new Error('failed to insert notification message')

    if (recipientIds.length > 0) {
      await db.insert(notificationDeliveries).values(
        recipientIds.map(uid => ({ messageId: message.id, recipientUserId: uid }))
      ).onConflictDoNothing({
        target: [notificationDeliveries.messageId, notificationDeliveries.recipientUserId]
      })
    }

    return { message, deliveredCount: recipientIds.length }
  },

  /**
   * 在用户激活时补发 audience='all_with_future' 的全部历史消息。
   * 用 ON CONFLICT DO NOTHING 保证幂等（重复激活不会重复投递）。
   */
  async fanOutFutureMessagesTo(userId: number) {
    const messages = await db.select({ id: notificationMessages.id }).from(notificationMessages)
      .where(and(
        eq(notificationMessages.audience, 'all_with_future'),
        isNull(notificationMessages.deletedAt)
      ))
    if (messages.length === 0) return 0

    await db.insert(notificationDeliveries).values(
      messages.map((m: { id: number }) => ({ messageId: m.id, recipientUserId: userId }))
    ).onConflictDoNothing({
      target: [notificationDeliveries.messageId, notificationDeliveries.recipientUserId]
    })
    return messages.length
  },

  /** 用户视角列表（join message，过滤被管理员删除的 message） */
  async listForUser(userId: number, opts: { limit?: number, offset?: number, onlyUnread?: boolean } = {}) {
    const { limit, offset } = normalizePagination(opts)
    const conds = [
      eq(notificationDeliveries.recipientUserId, userId),
      isNull(notificationMessages.deletedAt)
    ]
    if (opts.onlyUnread) conds.push(eq(notificationDeliveries.isRead, false))

    return db.select({
      id: notificationDeliveries.id,
      messageId: notificationMessages.id,
      title: notificationMessages.title,
      content: notificationMessages.content,
      level: notificationMessages.level,
      linkUrl: notificationMessages.linkUrl,
      senderActor: notificationMessages.senderActor,
      isRead: notificationDeliveries.isRead,
      readAt: notificationDeliveries.readAt,
      createdAt: notificationDeliveries.createdAt
    })
      .from(notificationDeliveries)
      .innerJoin(notificationMessages, eq(notificationMessages.id, notificationDeliveries.messageId))
      .where(and(...conds))
      .orderBy(desc(notificationDeliveries.createdAt))
      .limit(limit)
      .offset(offset)
  },

  async unreadCountForUser(userId: number) {
    const rows = await db.select({ value: count() })
      .from(notificationDeliveries)
      .innerJoin(notificationMessages, eq(notificationMessages.id, notificationDeliveries.messageId))
      .where(and(
        eq(notificationDeliveries.recipientUserId, userId),
        eq(notificationDeliveries.isRead, false),
        isNull(notificationMessages.deletedAt)
      ))
    return toNumber(rows[0]?.value)
  },

  async markRead(userId: number, deliveryId: number) {
    const res = await db.update(notificationDeliveries)
      .set({ isRead: true, readAt: new Date() })
      .where(and(
        eq(notificationDeliveries.id, deliveryId),
        eq(notificationDeliveries.recipientUserId, userId),
        eq(notificationDeliveries.isRead, false)
      ))
      .returning()
    return firstRow(res)
  },

  async markAllRead(userId: number) {
    const res = await db.update(notificationDeliveries)
      .set({ isRead: true, readAt: new Date() })
      .where(and(
        eq(notificationDeliveries.recipientUserId, userId),
        eq(notificationDeliveries.isRead, false)
      ))
      .returning({ id: notificationDeliveries.id })
    return res.length
  },

  // ---------- Admin ----------

  /** Admin 列表：每条 message + 当前已投递数 + 已读数 */
  async listMessagesForAdmin(opts: { limit?: number, offset?: number } = {}) {
    const { limit, offset } = normalizePagination(opts)

    return db.select({
      id: notificationMessages.id,
      title: notificationMessages.title,
      level: notificationMessages.level,
      audience: notificationMessages.audience,
      recipientCount: notificationMessages.recipientCount,
      senderActor: notificationMessages.senderActor,
      createdAt: notificationMessages.createdAt,
      deletedAt: notificationMessages.deletedAt,
      deliveredCount: sql<number>`(select count(*) from ${notificationDeliveries} where ${notificationDeliveries.messageId} = ${notificationMessages.id})`,
      readCount: sql<number>`(select count(*) from ${notificationDeliveries} where ${notificationDeliveries.messageId} = ${notificationMessages.id} and ${notificationDeliveries.isRead} = true)`
    })
      .from(notificationMessages)
      .where(isNull(notificationMessages.deletedAt))
      .orderBy(desc(notificationMessages.createdAt))
      .limit(limit)
      .offset(offset)
  },

  async getMessageDetail(messageId: number) {
    const messageRows = await db.select().from(notificationMessages)
      .where(eq(notificationMessages.id, messageId))
      .limit(1)
    const message = firstRow(messageRows)
    if (!message) return { message: null, deliveries: [] }

    const deliveries = await db.select({
      id: notificationDeliveries.id,
      recipientUserId: notificationDeliveries.recipientUserId,
      recipientUsername: users.username,
      isRead: notificationDeliveries.isRead,
      readAt: notificationDeliveries.readAt,
      createdAt: notificationDeliveries.createdAt
    })
      .from(notificationDeliveries)
      .leftJoin(users, eq(users.id, notificationDeliveries.recipientUserId))
      .where(eq(notificationDeliveries.messageId, messageId))
      .orderBy(desc(notificationDeliveries.createdAt))

    return { message, deliveries }
  },

  /** Admin 软删除消息：标记 deletedAt → 用户列表自动过滤；保留发送历史可审计 */
  async softDeleteMessage(messageId: number) {
    const res = await db.update(notificationMessages)
      .set({ deletedAt: new Date() })
      .where(eq(notificationMessages.id, messageId))
      .returning()
    return firstRow(res)
  }
}

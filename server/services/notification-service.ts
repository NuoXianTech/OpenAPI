import { and, asc, count, desc, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm'
import { db, type DatabaseTransaction } from '~~/server/db/client'
import { notificationDeliveries, notificationMessages, users } from '~~/server/db/schema'
import type { MessageLevel } from '#shared/types/content'
import { toNumber } from '~~/server/utils/number'
import { normalizePagination } from '~~/server/utils/pagination'
import { firstRow } from '~~/server/utils/row'

type NotificationLevel = MessageLevel
type NotificationAudience = 'specific' | 'all_current' | 'all_with_future'

interface SendNotificationInput {
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

const DELIVERY_BATCH_SIZE = 1000

async function insertDeliveries(
  tx: DatabaseTransaction,
  values: Array<{ messageId: number, recipientUserId: number }>
) {
  for (let offset = 0; offset < values.length; offset += DELIVERY_BATCH_SIZE) {
    await tx.insert(notificationDeliveries)
      .values(values.slice(offset, offset + DELIVERY_BATCH_SIZE))
      .onConflictDoNothing({
        target: [notificationDeliveries.messageId, notificationDeliveries.recipientUserId]
      })
  }
}

async function fanOutFutureMessages(
  tx: DatabaseTransaction,
  userId: number
) {
  const messages = await tx.select({ id: notificationMessages.id }).from(notificationMessages)
    .where(and(
      eq(notificationMessages.audience, 'all_with_future'),
      isNull(notificationMessages.deletedAt)
    ))

  await insertDeliveries(tx, messages.map(({ id: messageId }) => ({
    messageId,
    recipientUserId: userId
  })))
  return messages.length
}

export const notificationService = {
  /**
   * 创建一条 message + 立即投递。
   * 'specific' 仅给传入 ids；'all_current' / 'all_with_future' 立刻 fan-out 到全部活跃用户；
   * 'all_with_future' 还会被 userService.activateUser 在新用户激活时补发（见下面 fanOutFutureMessagesTo）。
   */
  async send(input: SendNotificationInput) {
    return db.transaction(async (tx: DatabaseTransaction) => {
      let recipientIds: number[]
      if (input.audience === 'specific') {
        const ids = Array.from(new Set((input.recipientUserIds || []).map(Number).filter(n => Number.isFinite(n) && n > 0)))
        if (ids.length === 0) throw new Error('specific audience requires recipientUserIds')
        const valid = await tx.select({ id: users.id }).from(users)
          .where(inArray(users.id, ids))
        recipientIds = valid.map((row: { id: number }) => row.id)
      } else if (input.audience === 'all_with_future') {
        // Lock every current user in a stable order. activateUser updates its user
        // row before reading historical messages, so either activation observes
        // this message or this send observes the activated user.
        const candidates = await tx.select({
          id: users.id,
          isActive: users.isActive,
          isBanned: users.isBanned
        }).from(users).orderBy(asc(users.id)).for('update')
        recipientIds = candidates
          .filter(user => user.isActive && !user.isBanned)
          .map(user => user.id)
      } else {
        const activeUsers = await tx.select({ id: users.id }).from(users)
          .where(and(eq(users.isActive, true), eq(users.isBanned, false)))
        recipientIds = activeUsers.map((row: { id: number }) => row.id)
      }

      const inserted = await tx.insert(notificationMessages).values({
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

      await insertDeliveries(tx, recipientIds.map(recipientUserId => ({
        messageId: message.id,
        recipientUserId
      })))

      return { message, deliveredCount: recipientIds.length }
    })
  },

  /**
   * 在用户激活时补发 audience='all_with_future' 的全部历史消息。
   * 用 ON CONFLICT DO NOTHING 保证幂等（重复激活不会重复投递）。
   */
  async fanOutFutureMessagesTo(
    userId: number,
    tx?: DatabaseTransaction
  ) {
    if (tx) return fanOutFutureMessages(tx, userId)
    return db.transaction(transaction => fanOutFutureMessages(transaction, userId))
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
  async listMessagesForAdmin(opts: {
    limit?: number
    offset?: number
    keyword?: string
    audience?: NotificationAudience
    level?: NotificationLevel
  } = {}) {
    const { limit, offset } = normalizePagination(opts)
    const keyword = opts.keyword?.trim()
    const where = and(
      isNull(notificationMessages.deletedAt),
      keyword
        ? or(
            ilike(notificationMessages.title, `%${keyword}%`),
            ilike(notificationMessages.senderActor, `%${keyword}%`)
          )
        : undefined,
      opts.audience ? eq(notificationMessages.audience, opts.audience) : undefined,
      opts.level ? eq(notificationMessages.level, opts.level) : undefined
    )

    const [items, totalRows] = await Promise.all([
      db.select({
        id: notificationMessages.id,
        title: notificationMessages.title,
        level: notificationMessages.level,
        audience: notificationMessages.audience,
        senderActor: notificationMessages.senderActor,
        createdAt: notificationMessages.createdAt,
        deliveredCount: count(notificationDeliveries.id),
        readCount: count(sql`case when ${notificationDeliveries.isRead} = true then 1 end`)
      })
        .from(notificationMessages)
        .leftJoin(notificationDeliveries, eq(notificationDeliveries.messageId, notificationMessages.id))
        .where(where)
        .groupBy(notificationMessages.id)
        .orderBy(desc(notificationMessages.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ value: count() }).from(notificationMessages).where(where)
    ])

    return { items, total: toNumber(totalRows[0]?.value) }
  },

  async getMessageDetail(messageId: number, opts: { limit?: number, offset?: number } = {}) {
    const { limit, offset } = normalizePagination(opts)
    const [messageRows, deliveries, totalRows] = await Promise.all([
      db.select().from(notificationMessages)
        .where(eq(notificationMessages.id, messageId))
        .limit(1),
      db.select({
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
        .limit(limit)
        .offset(offset),
      db.select({ value: count() }).from(notificationDeliveries)
        .where(eq(notificationDeliveries.messageId, messageId))
    ])

    return {
      message: firstRow(messageRows) ?? null,
      deliveries,
      total: toNumber(totalRows[0]?.value)
    }
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

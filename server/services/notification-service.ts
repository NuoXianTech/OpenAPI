import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  max,
  or,
  sql
} from 'drizzle-orm'
import type { MessageLevel } from '#shared/types/content'
import { db, type DatabaseTransaction } from '~~/server/db/client'
import {
  notificationDeliveries,
  notificationMessages,
  users
} from '~~/server/db/schema'
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
  recipientUserIds?: number[]
  senderUserId?: number | null
  senderActor?: string | null
}

const DELIVERY_BATCH_SIZE = 1000

function visibleToUser(userId: number) {
  return or(
    and(
      eq(notificationMessages.audience, 'specific'),
      isNotNull(notificationDeliveries.id)
    ),
    eq(notificationMessages.audience, 'all_with_future'),
    and(
      eq(notificationMessages.audience, 'all_current'),
      gte(notificationMessages.recipientCutoffUserId, userId)
    )
  )
}

function unreadForUser() {
  return or(
    isNull(notificationDeliveries.id),
    eq(notificationDeliveries.isRead, false)
  )
}

async function insertSpecificRecipients(
  tx: DatabaseTransaction,
  messageId: number,
  recipientUserIds: number[]
) {
  for (let offset = 0; offset < recipientUserIds.length; offset += DELIVERY_BATCH_SIZE) {
    await tx.insert(notificationDeliveries)
      .values(recipientUserIds
        .slice(offset, offset + DELIVERY_BATCH_SIZE)
        .map(recipientUserId => ({ messageId, recipientUserId })))
      .onConflictDoNothing({
        target: [
          notificationDeliveries.messageId,
          notificationDeliveries.recipientUserId
        ]
      })
  }
}

async function upsertReadReceipts(
  tx: DatabaseTransaction,
  messageIds: number[],
  userId: number,
  readAt: Date
) {
  for (let offset = 0; offset < messageIds.length; offset += DELIVERY_BATCH_SIZE) {
    await tx.insert(notificationDeliveries)
      .values(messageIds
        .slice(offset, offset + DELIVERY_BATCH_SIZE)
        .map(messageId => ({
          messageId,
          recipientUserId: userId,
          isRead: true,
          readAt
        })))
      .onConflictDoUpdate({
        target: [
          notificationDeliveries.messageId,
          notificationDeliveries.recipientUserId
        ],
        set: { isRead: true, readAt }
      })
  }
}

export const notificationService = {
  async send(input: SendNotificationInput) {
    return db.transaction(async (tx: DatabaseTransaction) => {
      let recipientIds: number[] = []
      let recipientCount: number
      let recipientCutoffUserId: number | null = null

      if (input.audience === 'specific') {
        const ids = Array.from(new Set(
          (input.recipientUserIds ?? [])
            .map(Number)
            .filter(id => Number.isFinite(id) && id > 0)
        ))
        if (ids.length === 0) {
          throw new Error('specific audience requires recipientUserIds')
        }
        recipientIds = (await tx.select({ id: users.id }).from(users)
          .where(inArray(users.id, ids))).map(row => row.id)
        recipientCount = recipientIds.length
      } else {
        const snapshot = firstRow(await tx.select({
          count: count(users.id),
          maxUserId: max(users.id)
        }).from(users))
        recipientCount = toNumber(snapshot?.count)
        if (input.audience === 'all_current') {
          recipientCutoffUserId = Number(snapshot?.maxUserId ?? 0)
        }
      }

      const message = firstRow(await tx.insert(notificationMessages).values({
        title: input.title,
        content: input.content,
        level: input.level ?? 'info',
        linkUrl: input.linkUrl ?? null,
        audience: input.audience,
        recipientCount,
        recipientCutoffUserId,
        senderUserId: input.senderUserId ?? null,
        senderActor: input.senderActor ?? null
      }).returning())
      if (!message) throw new Error('failed to insert notification message')

      if (recipientIds.length > 0) {
        await insertSpecificRecipients(tx, message.id, recipientIds)
      }
      return { message, deliveredCount: recipientCount }
    })
  },

  async listForUser(
    userId: number,
    opts: { limit?: number, offset?: number, onlyUnread?: boolean } = {}
  ) {
    const { limit, offset } = normalizePagination(opts)
    return db.select({
      id: notificationMessages.id,
      messageId: notificationMessages.id,
      title: notificationMessages.title,
      content: notificationMessages.content,
      level: notificationMessages.level,
      linkUrl: notificationMessages.linkUrl,
      senderActor: notificationMessages.senderActor,
      isRead: sql<boolean>`coalesce(${notificationDeliveries.isRead}, false)`,
      readAt: notificationDeliveries.readAt,
      createdAt: notificationMessages.createdAt
    })
      .from(notificationMessages)
      .leftJoin(notificationDeliveries, and(
        eq(notificationDeliveries.messageId, notificationMessages.id),
        eq(notificationDeliveries.recipientUserId, userId)
      ))
      .where(and(
        isNull(notificationMessages.deletedAt),
        visibleToUser(userId),
        opts.onlyUnread ? unreadForUser() : undefined
      ))
      .orderBy(desc(notificationMessages.createdAt))
      .limit(limit)
      .offset(offset)
  },

  async unreadCountForUser(userId: number) {
    const row = firstRow(await db.select({ value: count() })
      .from(notificationMessages)
      .leftJoin(notificationDeliveries, and(
        eq(notificationDeliveries.messageId, notificationMessages.id),
        eq(notificationDeliveries.recipientUserId, userId)
      ))
      .where(and(
        isNull(notificationMessages.deletedAt),
        visibleToUser(userId),
        unreadForUser()
      )))
    return toNumber(row?.value)
  },

  async markRead(userId: number, messageId: number) {
    return db.transaction(async (tx: DatabaseTransaction) => {
      const visible = firstRow(await tx.select({
        id: notificationMessages.id,
        isRead: notificationDeliveries.isRead
      }).from(notificationMessages)
        .leftJoin(notificationDeliveries, and(
          eq(notificationDeliveries.messageId, notificationMessages.id),
          eq(notificationDeliveries.recipientUserId, userId)
        ))
        .where(and(
          eq(notificationMessages.id, messageId),
          isNull(notificationMessages.deletedAt),
          visibleToUser(userId)
        ))
        .limit(1))
      if (!visible) return null
      if (!visible.isRead) {
        await upsertReadReceipts(tx, [messageId], userId, new Date())
      }
      return firstRow(await tx.select().from(notificationDeliveries)
        .where(and(
          eq(notificationDeliveries.messageId, messageId),
          eq(notificationDeliveries.recipientUserId, userId)
        )).limit(1)) ?? null
    })
  },

  async markAllRead(userId: number) {
    return db.transaction(async (tx: DatabaseTransaction) => {
      const unread = await tx.select({ id: notificationMessages.id })
        .from(notificationMessages)
        .leftJoin(notificationDeliveries, and(
          eq(notificationDeliveries.messageId, notificationMessages.id),
          eq(notificationDeliveries.recipientUserId, userId)
        ))
        .where(and(
          isNull(notificationMessages.deletedAt),
          visibleToUser(userId),
          unreadForUser()
        ))
      await upsertReadReceipts(
        tx,
        unread.map(message => message.id),
        userId,
        new Date()
      )
      return unread.length
    })
  },

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
        deliveredCount: notificationMessages.recipientCount,
        readCount: count(sql`case when ${notificationDeliveries.isRead} = true then 1 end`)
      })
        .from(notificationMessages)
        .leftJoin(notificationDeliveries, eq(
          notificationDeliveries.messageId,
          notificationMessages.id
        ))
        .where(where)
        .groupBy(notificationMessages.id)
        .orderBy(desc(notificationMessages.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ value: count() }).from(notificationMessages).where(where)
    ])

    return { items, total: toNumber(totalRows[0]?.value) }
  },

  async getMessageDetail(
    messageId: number,
    opts: { limit?: number, offset?: number } = {}
  ) {
    const { limit, offset } = normalizePagination(opts)
    const message = firstRow(await db.select().from(notificationMessages)
      .where(eq(notificationMessages.id, messageId))
      .limit(1)) ?? null
    if (!message) return { message: null, deliveries: [], total: 0 }

    if (message.audience === 'specific') {
      const [deliveries, totalRows] = await Promise.all([
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
      return { message, deliveries, total: toNumber(totalRows[0]?.value) }
    }

    const eligibility = message.audience === 'all_current'
      ? lte(users.id, message.recipientCutoffUserId!)
      : undefined
    const [deliveries, totalRows] = await Promise.all([
      db.select({
        id: users.id,
        recipientUserId: users.id,
        recipientUsername: users.username,
        isRead: sql<boolean>`coalesce(${notificationDeliveries.isRead}, false)`,
        readAt: notificationDeliveries.readAt,
        createdAt: users.createdAt
      })
        .from(users)
        .leftJoin(notificationDeliveries, and(
          eq(notificationDeliveries.messageId, messageId),
          eq(notificationDeliveries.recipientUserId, users.id)
        ))
        .where(eligibility)
        .orderBy(desc(users.id))
        .limit(limit)
        .offset(offset),
      db.select({ value: count() }).from(users).where(eligibility)
    ])
    return { message, deliveries, total: toNumber(totalRows[0]?.value) }
  },

  async softDeleteMessage(messageId: number) {
    return firstRow(await db.update(notificationMessages)
      .set({ deletedAt: new Date() })
      .where(eq(notificationMessages.id, messageId))
      .returning())
  }
}

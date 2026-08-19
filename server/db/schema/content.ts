import {
  pgTable,
  serial,
  bigserial,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  index,
  uniqueIndex,
  check
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { users } from './user'

// ------------------------------------------------------------------
// Friend Links（友情链接）
//
// logoUrl 保留作为外站 logo 图片 URL（前台卡片展示用）。
// createdBy 是操作者快照（null=admin），无外键。
// ------------------------------------------------------------------
export const friendLinks = pgTable('friend_links', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 140 }).notNull(),
  url: varchar('url', { length: 1000 }).notNull(),
  description: text('description'),
  logoUrl: varchar('logo_url', { length: 1000 }),
  isActive: boolean('is_active').notNull().default(true),
  createdBy: integer('created_by'), // 操作者快照，null=admin
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date())
})

// ------------------------------------------------------------------
// Announcements（站点公告）
//
// 由 admin 维护，软删（deletedAt）支持"管理端撤回"语义。
// createdBy / updatedBy 为操作者快照（null=admin），无外键。
// ------------------------------------------------------------------
export const announcements = pgTable('announcements', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 200 }).notNull(),
  content: text('content').notNull(),
  level: varchar('level', { length: 20 }).notNull().default('info'), // info / success / warning / critical
  isPinned: boolean('is_pinned').notNull().default(false),
  isEnabled: boolean('is_enabled').notNull().default(true),
  linkUrl: varchar('link_url', { length: 1000 }),
  sortOrder: integer('sort_order').notNull().default(0),
  createdBy: integer('created_by'), // 操作者快照，null=admin
  updatedBy: integer('updated_by'), // 操作者快照，null=admin
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date())
}, table => [
  index('announcements_enabled_pin_sort_idx').on(table.isEnabled, table.isPinned, table.sortOrder),
  check('announcements_level_chk', sql`${table.level} in ('info', 'success', 'warning', 'critical')`)
])

// ------------------------------------------------------------------
// Notifications · 站内信（admin 定向 / 广播）
//
// 拆成两张表：
// - notification_messages：admin 一次"发送"对应一行，是发送历史的事实表
// - notification_deliveries：定向收件人或广播已读回执，保持稀疏
//
// 设计原则（对应需求 #9 / #17）：
// 1. 用户不能删除/隐藏自己收到的通知，只能 mark-read。所有用户接口仅暴露
//    list / unread-count / mark-read / mark-all-read 四种操作。
// 2. admin 可软删 messages（deletedAt），用户侧通过 messages.deletedAt 过滤自然消失。
// 3. 广播在查询时按 audience 匹配，不按用户 fan-out。all_current 通过发送时
//    最大 userId 固定边界；all_with_future 没有边界，新用户自然可见。
// 4. 用户硬删时 cascade 自动清除该用户全部投递（含已读/未读）。
// ------------------------------------------------------------------
export const notificationMessages = pgTable('notification_messages', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 200 }).notNull(),
  content: text('content').notNull(),
  level: varchar('level', { length: 20 }).notNull().default('info'),
  linkUrl: varchar('link_url', { length: 1000 }),
  /** specific=指定用户 / all_current=发送时已有用户 / all_with_future=当前及未来注册用户 */
  audience: varchar('audience', { length: 20 }).notNull().default('specific'),
  /** 发送时符合受众规则的用户数快照（all_with_future 后续新增不会回写） */
  recipientCount: integer('recipient_count').notNull().default(0),
  /** all_current 的 userId 上界；其他受众为 null */
  recipientCutoffUserId: integer('recipient_cutoff_user_id'),
  senderUserId: integer('sender_user_id'), // 发送者快照（null=admin），无 FK
  /** 冗余：admin 名取自 .env，存名快照便于用户被删后仍可追溯 */
  senderActor: varchar('sender_actor', { length: 140 }),
  /** 管理员软删 → 用户侧不再可见（messages.deletedAt 过滤），投递记录仍存在 */
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, table => [
  index('notification_messages_audience_idx').on(table.audience),
  index('notification_messages_created_at_idx').on(table.createdAt),
  check('notification_messages_level_chk', sql`${table.level} in ('info', 'success', 'warning', 'critical')`),
  check('notification_messages_audience_chk', sql`${table.audience} in ('specific', 'all_current', 'all_with_future')`),
  check('notification_messages_recipient_count_chk', sql`${table.recipientCount} >= 0`),
  check('notification_messages_recipient_cutoff_chk', sql`(
    ${table.audience} = 'all_current' and ${table.recipientCutoffUserId} >= 0
  ) or (
    ${table.audience} <> 'all_current' and ${table.recipientCutoffUserId} is null
  )`)
])

export const notificationDeliveries = pgTable('notification_deliveries', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  messageId: integer('message_id').notNull().references(() => notificationMessages.id, { onDelete: 'cascade' }),
  recipientUserId: integer('recipient_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  isRead: boolean('is_read').notNull().default(false),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, table => [
  uniqueIndex('notification_deliveries_msg_user_uq').on(table.messageId, table.recipientUserId),
  index('notification_deliveries_user_created_idx').on(table.recipientUserId, table.createdAt),
  index('notification_deliveries_user_unread_idx').on(table.recipientUserId, table.isRead),
  check('notification_deliveries_read_state_chk', sql`(
    ${table.isRead} = true and ${table.readAt} is not null
  ) or (
    ${table.isRead} = false and ${table.readAt} is null
  )`)
])

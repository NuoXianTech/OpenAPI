import {
  pgTable,
  serial,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  index,
  uniqueIndex
} from 'drizzle-orm/pg-core'
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
}, table => [
  index('friend_links_active_idx').on(table.isActive)
])

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
  startAt: timestamp('start_at', { withTimezone: true }),
  endAt: timestamp('end_at', { withTimezone: true }),
  linkUrl: varchar('link_url', { length: 1000 }),
  sortOrder: integer('sort_order').notNull().default(0),
  createdBy: integer('created_by'), // 操作者快照，null=admin
  updatedBy: integer('updated_by'), // 操作者快照，null=admin
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date())
}, table => [
  index('announcements_enabled_pin_sort_idx').on(table.isEnabled, table.isPinned, table.sortOrder),
  index('announcements_window_idx').on(table.startAt, table.endAt)
])

// ------------------------------------------------------------------
// Notifications · 站内信（admin 定向 / 广播）
//
// 拆成两张表：
// - notification_messages：admin 一次"发送"对应一行，是发送历史的事实表
// - notification_deliveries：每位收件人一行，承载已读状态
//
// 设计原则（对应需求 #9 / #17）：
// 1. 用户不能删除/隐藏自己收到的通知，只能 mark-read。所有用户接口仅暴露
//    list / unread-count / mark-read / mark-all-read 四种操作。
// 2. admin 可软删 messages（deletedAt），用户侧通过 messages.deletedAt 过滤自然消失。
// 3. audience='all_with_future' 时：当前用户走立即 fan-out，新注册用户在激活
//    时由 userService.activateUser → notificationService.fanOutFutureMessagesTo 触发补发；
//    管理员侧的发送历史不会因此污染（recipientCount 只是发送时快照）。
// 4. 用户硬删时 cascade 自动清除该用户全部投递（含已读/未读）。
// ------------------------------------------------------------------
export const notificationMessages = pgTable('notification_messages', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 200 }).notNull(),
  content: text('content').notNull(),
  level: varchar('level', { length: 20 }).notNull().default('info'),
  linkUrl: varchar('link_url', { length: 1000 }),
  /** specific=指定用户 / all_current=当前所有活跃用户 / all_with_future=当前及未来注册用户 */
  audience: varchar('audience', { length: 20 }).notNull().default('specific'),
  /** 发送时立即投递的收件人数快照（all_with_future 后续新增不会回写此字段） */
  recipientCount: integer('recipient_count').notNull().default(0),
  senderUserId: integer('sender_user_id'), // 发送者快照（null=admin），无 FK
  /** 冗余：admin 名取自 .env，存名快照便于用户被删后仍可追溯 */
  senderActor: varchar('sender_actor', { length: 140 }),
  /** 管理员软删 → 用户侧不再可见（messages.deletedAt 过滤），投递记录仍存在 */
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, table => [
  index('notification_messages_audience_idx').on(table.audience),
  index('notification_messages_created_at_idx').on(table.createdAt)
])

export const notificationDeliveries = pgTable('notification_deliveries', {
  id: serial('id').primaryKey(),
  messageId: integer('message_id').notNull().references(() => notificationMessages.id, { onDelete: 'cascade' }),
  recipientUserId: integer('recipient_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  isRead: boolean('is_read').notNull().default(false),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, table => [
  uniqueIndex('notification_deliveries_msg_user_uq').on(table.messageId, table.recipientUserId),
  index('notification_deliveries_message_idx').on(table.messageId),
  index('notification_deliveries_user_created_idx').on(table.recipientUserId, table.createdAt),
  index('notification_deliveries_user_unread_idx').on(table.recipientUserId, table.isRead)
])

import {
  pgTable,
  serial,
  varchar,
  boolean,
  timestamp,
  text,
  bigint,
  integer,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 50 }).unique().notNull(),
  displayName: varchar('display_name', { length: 100 }),
  // email 以原大小写存储，通过 lower(email) 唯一索引做不区分大小写去重
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  avatarUrl: varchar('avatar_url', { length: 255 }),
  bio: text('bio'),
  credits: bigint('credits', { mode: 'number' }).notNull().default(0), // API 配额余额
  isActive: boolean('is_active').default(false).notNull(),
  isBanned: boolean('is_banned').default(false).notNull(),
  bannedReason: varchar('banned_reason', { length: 500 }),
  bannedUntil: timestamp('banned_until', { withTimezone: true }),
  loginAttemptsCount: bigint('login_attempts_count', { mode: 'number' }).notNull().default(0),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  lastLoginIp: varchar('last_login_ip', { length: 45 }),
  lastLoginUserAgent: varchar('last_login_user_agent', { length: 500 }),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()),
}, table => [
  uniqueIndex('users_email_lower_uq').on(sql`lower(${table.email})`),
  index('users_active_banned_idx').on(table.isActive, table.isBanned),
  index('users_deleted_at_idx').on(table.deletedAt),
])

// ------------------------------------------------------------------
// Credit Transactions（余额变动流水）
//
// 每一次余额变动都落一条流水：
//   - admin 调整：reason='admin_grant' / 'admin_revoke' / 'admin_reset'
//   - API 调用扣费：reason='api_charge'，apiCallId 关联具体调用
//   - 调用失败退款：reason='api_refund'
//   - 注册赠送：reason='signup_bonus'
//
// amount 正负表示进出（正=加余额，负=扣余额）。
// balanceAfter 为快照值，便于审计与对账。
// ------------------------------------------------------------------
export const creditTransactions = pgTable('credit_transactions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(), // 正=入账，负=出账
  balanceAfter: bigint('balance_after', { mode: 'number' }).notNull(),
  reason: varchar('reason', { length: 50 }).notNull(),
  apiId: integer('api_id'), // 仅 reason=api_charge / api_refund 有值
  apiCallId: integer('api_call_id'), // 关联 apiCalls.id
  operatorId: integer('operator_id'), // admin 操作时记录管理员（admin 伪用户用 null）
  operatorName: varchar('operator_name', { length: 140 }),
  remark: varchar('remark', { length: 500 }),
  meta: jsonb('meta').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  index('credit_transactions_user_created_idx').on(table.userId, table.createdAt),
  index('credit_transactions_reason_idx').on(table.reason),
  index('credit_transactions_api_call_idx').on(table.apiCallId),
])

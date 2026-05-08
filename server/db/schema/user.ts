import {
  pgTable,
  serial,
  varchar,
  boolean,
  timestamp,
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
  // 显示名：用于导航栏展示，不参与登录；为空时回退 username
  displayName: varchar('display_name', { length: 100 }),
  // email 以原大小写存储，通过 lower(email) 唯一索引做不区分大小写去重
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  // 头像统一由 server/utils/cravatar.ts 通过 email 派生，不落库
  credits: bigint('credits', { mode: 'number' }).notNull().default(0), // API 配额余额
  isActive: boolean('is_active').default(false).notNull(),
  isBanned: boolean('is_banned').default(false).notNull(),
  bannedReason: varchar('banned_reason', { length: 500 }),
  bannedUntil: timestamp('banned_until', { withTimezone: true }),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  lastLoginIp: varchar('last_login_ip', { length: 45 }),
  lastLoginUserAgent: varchar('last_login_user_agent', { length: 500 }),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()),
}, table => [
  uniqueIndex('users_email_lower_uq').on(sql`lower(${table.email})`),
  index('users_active_banned_idx').on(table.isActive, table.isBanned),
])

// ------------------------------------------------------------------
// Credit Transactions（余额变动流水）
//
// 每一次余额变动都落一条流水：
//   - admin 调整：reason='admin_grant' / 'admin_revoke' / 'admin_reset'
//   - API 调用扣费：reason='api_charge'，apiCallId 关联具体调用
//   - 调用失败退款：reason='api_refund'
//   - 注册赠送：reason='signup_bonus'
//   - 兑换码兑换：reason='redemption_code'，meta.codeId 关联兑换码
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

// ------------------------------------------------------------------
// Redemption Codes（兑换码）
//
// 管理员生成兑换码后，用户在积分页输入兑换。一个兑换码可以是单次性
// （maxUses=1，用完即失效），也可以是多次性（maxUses>1，被多个用户共享一次）。
// 同一用户对同一兑换码只能兑换一次，由 redemptionRecords 唯一索引保证。
//
// 并发安全：兑换在事务里用 UPDATE ... WHERE used_count < max_uses RETURNING
// 做条件递增，避免超额兑换。
// ------------------------------------------------------------------
export const redemptionCodes = pgTable('redemption_codes', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 64 }).notNull().unique(),
  amount: integer('amount').notNull(), // 兑换得到的余额，> 0
  batchId: varchar('batch_id', { length: 64 }), // 同一批次共享，便于管理员后台分组
  note: varchar('note', { length: 500 }), // 批次备注（活动名等）
  maxUses: integer('max_uses').notNull().default(1), // 总可兑换次数（不同用户共享）
  usedCount: integer('used_count').notNull().default(0), // 已被兑换次数
  expiresAt: timestamp('expires_at', { withTimezone: true }), // null = 永不过期
  isEnabled: boolean('is_enabled').notNull().default(true),
  createdBy: integer('created_by'), // admin id（admin 伪用户为 null）
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, table => [
  index('redemption_codes_batch_idx').on(table.batchId),
  index('redemption_codes_enabled_expires_idx').on(table.isEnabled, table.expiresAt),
])

// ------------------------------------------------------------------
// Redemption Records（兑换记录）
//
// (codeId, userId) 唯一索引保证同一用户对同一码只能兑换一次。
// transactionId 指向写入的 credit_transactions 行，便于追溯。
// ------------------------------------------------------------------
export const redemptionRecords = pgTable('redemption_records', {
  id: serial('id').primaryKey(),
  codeId: integer('code_id').notNull().references(() => redemptionCodes.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  transactionId: integer('transaction_id'), // 关联 credit_transactions.id
  ip: varchar('ip', { length: 45 }),
  redeemedAt: timestamp('redeemed_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  uniqueIndex('redemption_records_code_user_uq').on(table.codeId, table.userId),
  index('redemption_records_user_redeemed_idx').on(table.userId, table.redeemedAt),
])

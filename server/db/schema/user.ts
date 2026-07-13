import {
  pgTable,
  serial,
  varchar,
  boolean,
  timestamp,
  integer,
  jsonb,
  index,
  uniqueIndex,
  check
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// ------------------------------------------------------------------
// Users（用户主表 · 硬删除）
//
// 删除用户走真正的 DELETE：users 行物理消失，FK 级联自动清理
// oauthAccounts / apiKeys / notificationDeliveries / loginLogs 等"账号级"附属表。
//
// 与之相对，"审计型"日志表（creditTransactions / apiCalls / operationLogs）
// 通过解除外键约束，仅以 userId 整数快照保存历史归属，
// 不会随用户硬删消失。PostgreSQL 的 serial 序列不会回收已用过的 id，因此
// 硬删后 userId 值在全局范围内永远是稳定唯一的快照。
// ------------------------------------------------------------------
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  role: varchar('role', { length: 20 }).$type<'user' | 'admin'>().notNull().default('user'),
  username: varchar('username', { length: 50 }).notNull(),
  // 昵称：用于导航栏展示，不参与登录；为空时回退 username
  displayName: varchar('display_name', { length: 100 }),
  // email 以原大小写存储，通过 lower(email) 唯一索引做不区分大小写去重
  email: varchar('email', { length: 255 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  // 头像统一由 auth 工具通过 email 派生，不落库
  credits: integer('credits').notNull().default(0),
  isActive: boolean('is_active').default(false).notNull(),
  isBanned: boolean('is_banned').default(false).notNull(),
  bannedReason: varchar('banned_reason', { length: 500 }),
  bannedUntil: timestamp('banned_until', { withTimezone: true }),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  lastLoginIp: varchar('last_login_ip', { length: 45 }),
  lastLoginUserAgent: varchar('last_login_user_agent', { length: 500 }),
  // 上次签到时间。配合 siteSettings.checkinRefreshHours 决定下次可签到时刻；签到流水另存于 creditTransactions(reason='checkin')。
  lastCheckinAt: timestamp('last_checkin_at', { withTimezone: true }),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  // 会话失效版本号：改密 / 重置 / 全局登出时自增，令该账号所有已签发 JWT 立即失效（见 server/utils/jwt.ts）
  tokenVersion: integer('token_version').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date())
}, table => [
  uniqueIndex('users_username_uq').on(table.username),
  uniqueIndex('users_email_lower_uq').on(sql`lower(${table.email})`),
  index('users_active_banned_idx').on(table.isActive, table.isBanned),
  check('users_role_chk', sql`${table.role} in ('user', 'admin')`)
])

// ------------------------------------------------------------------
// Credit Transactions（积分变动流水 · 审计不可变）
//
// 每一次积分变动都落一条流水：
//   - admin 调整：reason='admin_grant' / 'admin_revoke' / 'admin_reset'
//   - API 调用扣费：reason='api_charge'，apiCallId 关联具体调用
//   - 调用失败退款：reason='api_refund'
//   - 注册赠送：reason='signup_bonus'，金额取自 siteSettings.defaultRegisterCredits
//   - 兑换码兑换：reason='redemption_code'，codeId 关联兑换码、ip 记录兑换来源；
//     (codeId, userId) 部分唯一索引保证同一用户对同一码只兑换一次（接管原 redemptionRecords 职责）
//
// userId 是 users.id 的整数快照，**无外键约束**。用户硬删后该字段保留，
// 但无法 join 到 users 表。读取端把它当作"曾经存在的用户 id"看待。
// operatorId 记录操作者 users.id 快照；null 表示系统任务或无操作者快照。
// ------------------------------------------------------------------
export const creditTransactions = pgTable('credit_transactions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'), // users.id 快照，无 FK
  amount: integer('amount').notNull(), // 正=入账，负=出账
  balanceAfter: integer('balance_after').notNull(),
  reason: varchar('reason', { length: 50 }).notNull(),
  apiId: integer('api_id'), // 仅 reason=api_charge / api_refund 有值（无 FK 解耦）
  apiCallId: integer('api_call_id'), // 关联 apiCalls.id 快照
  codeId: integer('code_id'), // 仅 reason=redemption_code 有值，关联 redemptionCodes.id 快照（无 FK）
  operatorId: integer('operator_id'), // users.id 快照；null = 系统任务或无操作者快照
  operatorName: varchar('operator_name', { length: 140 }), // 操作者名快照
  ip: varchar('ip', { length: 45 }), // 操作来源 IP 快照；目前仅兑换码兑换写入，其余 reason 留 null
  remark: varchar('remark', { length: 500 }),
  meta: jsonb('meta').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, table => [
  index('credit_transactions_created_at_idx').on(table.createdAt.desc()),
  index('credit_transactions_user_created_idx').on(table.userId, table.createdAt.desc()),
  index('credit_transactions_reason_idx').on(table.reason),
  index('credit_transactions_api_call_idx').on(table.apiCallId),
  index('credit_transactions_code_idx').on(table.codeId),
  // 防御重复扣费/退款：(apiCallId, reason) 在 apiCallId 非空时唯一。
  // 即使补偿队列双调度，第二次 INSERT 被这条索引拒绝、事务回滚，余额不会被双扣。
  uniqueIndex('credit_transactions_api_call_reason_uq')
    .on(table.apiCallId, table.reason)
    .where(sql`${table.apiCallId} IS NOT NULL`),
  // 防止同一用户重复兑换同一兑换码：(codeId, userId) 在兑换行上唯一。
  // 接管原 redemptionRecords 的防重职责；并发重复兑换时第二条 INSERT 被拒、事务回滚，
  // usedCount 递增一并撤销。仅约束兑换行，不波及 api_charge 等其它 reason。
  uniqueIndex('credit_transactions_redemption_user_uq')
    .on(table.codeId, table.userId)
    .where(sql`${table.reason} = 'redemption_code' AND ${table.codeId} IS NOT NULL`)
])

// ------------------------------------------------------------------
// Redemption Codes（兑换码 · admin 生成）
//
// 单次性（maxUses=1）或多次性（maxUses>1，被多个用户共享）。
// 同一用户对同一兑换码只能兑换一次，由 creditTransactions 上
// (codeId, userId) where reason='redemption_code' 部分唯一索引保证。
// 并发：兑换在事务里用 UPDATE ... WHERE used_count < max_uses RETURNING
// 做条件递增，避免超额兑换。
// ------------------------------------------------------------------
export const redemptionCodes = pgTable('redemption_codes', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 64 }).notNull().unique(),
  amount: integer('amount').notNull(),
  batchId: varchar('batch_id', { length: 64 }),
  note: varchar('note', { length: 500 }),
  maxUses: integer('max_uses').notNull().default(1),
  usedCount: integer('used_count').notNull().default(0),
  expiresAt: timestamp('expires_at', { withTimezone: true }), // null = 永不过期
  isEnabled: boolean('is_enabled').notNull().default(true),
  createdBy: integer('created_by'), // 操作者 users.id 快照；null = 系统任务或无操作者快照
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date())
}, table => [
  index('redemption_codes_batch_idx').on(table.batchId),
  index('redemption_codes_enabled_expires_idx').on(table.isEnabled, table.expiresAt),
  index('redemption_codes_created_at_idx').on(table.createdAt.desc())
])

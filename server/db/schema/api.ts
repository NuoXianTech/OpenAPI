import {
  pgTable,
  serial,
  bigserial,
  bigint,
  varchar,
  integer,
  text,
  boolean,
  jsonb,
  timestamp,
  date,
  uuid,
  index,
  check,
  primaryKey
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { users } from './user'

// ------------------------------------------------------------------
// API Keys（用户访问 Platform Gateway 的密钥）
//
// userId cascade：用户硬删时自动清除该用户所有密钥。
// 明文不落库：keyDigest 用于鉴权查询，keyCiphertext 用于授权后重复查看。
// ------------------------------------------------------------------
export const apiKeys = pgTable('api_keys', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  keyDigest: varchar('key_digest', { length: 64 }).notNull().unique(),
  keyCiphertext: text('key_ciphertext').notNull(),
  keyPreview: varchar('key_preview', { length: 32 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),

  scopes: jsonb('scopes').$type<string[]>(),
  ipWhitelist: jsonb('ip_whitelist').$type<string[]>(),
  totalQuota: integer('total_quota'),
  usedCredits: integer('used_credits').notNull().default(0),
  totalCalls: integer('total_calls').notNull().default(0),

  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  lastUsedIp: varchar('last_used_ip', { length: 45 }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date())
}, table => [
  index('api_keys_user_idx').on(table.userId),
  check('api_keys_total_quota_chk', sql`${table.totalQuota} is null or ${table.totalQuota} >= 0`),
  check('api_keys_used_credits_chk', sql`${table.usedCredits} >= 0`),
  check('api_keys_total_calls_chk', sql`${table.totalCalls} >= 0`)
])

// ------------------------------------------------------------------
// API Calls（Route 调用日志 · 审计不可变）
//
// routeId / userId / apiKeyId 都是快照，不设外键。Route、用户或密钥删除后，
// 调用记录仍然保留；targetName、apiKeyName 和 path 用于展示历史上下文。
// ------------------------------------------------------------------
export const apiCalls = pgTable('api_calls', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  requestId: uuid('request_id').defaultRandom().notNull(),
  routeId: uuid('route_id').notNull(),
  targetName: varchar('target_name', { length: 160 }),
  apiKeyId: integer('api_key_id'),
  apiKeyName: varchar('api_key_name', { length: 100 }),
  userId: integer('user_id'),
  path: varchar('path', { length: 1000 }).notNull(),
  method: varchar('method', { length: 10 }).notNull(),
  queryString: varchar('query_string', { length: 2000 }),

  statusCode: integer('status_code').notNull(),
  latencyMs: integer('latency_ms').notNull().default(0),

  ip: varchar('ip', { length: 45 }),
  userAgent: varchar('user_agent', { length: 500 }),
  referer: varchar('referer', { length: 1000 }),

  requestSize: integer('request_size'),
  responseSize: integer('response_size'),

  errorCode: varchar('error_code', { length: 50 }),
  errorMessage: varchar('error_message', { length: 500 }),

  creditsCost: integer('credits_cost').notNull().default(0),
  // false = 业务可见拒绝，写日志但不进入成功率和调用量聚合。
  isCounted: boolean('is_counted').notNull().default(true),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, table => [
  index('api_calls_created_at_idx').on(table.createdAt.desc()),
  index('api_calls_route_created_at_idx').on(table.routeId, table.createdAt.desc()),
  index('api_calls_user_created_at_idx').on(table.userId, table.createdAt.desc()),
  index('api_calls_api_key_created_at_idx').on(table.apiKeyId, table.createdAt.desc()),
  index('api_calls_request_id_idx').on(table.requestId),
  check('api_calls_status_code_chk', sql`${table.statusCode} between 100 and 599`),
  check('api_calls_latency_ms_chk', sql`${table.latencyMs} >= 0`),
  check('api_calls_request_size_chk', sql`${table.requestSize} is null or ${table.requestSize} >= 0`),
  check('api_calls_response_size_chk', sql`${table.responseSize} is null or ${table.responseSize} >= 0`),
  check('api_calls_credits_cost_chk', sql`${table.creditsCost} >= 0`)
])

// ------------------------------------------------------------------
// API Call Stats（按 Route × 自然日聚合）
//
// 只聚合 apiCalls.isCounted=true 的调用。routeId 是快照，不依赖 Route 生命周期。
// ------------------------------------------------------------------
export const apiCallStats = pgTable('api_call_stats', {
  routeId: uuid('route_id').notNull(),
  statDate: date('stat_date').notNull(),
  totalCount: integer('total_count').notNull().default(0),
  successCount: integer('success_count').notNull().default(0),
  failureCount: integer('failure_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date())
}, table => [
  primaryKey({ columns: [table.routeId, table.statDate] }),
  index('api_call_stats_stat_date_idx').on(table.statDate),
  check('api_call_stats_counts_chk', sql`${table.totalCount} >= 0 and ${table.successCount} >= 0 and ${table.failureCount} >= 0 and ${table.successCount} + ${table.failureCount} = ${table.totalCount}`)
])

// ------------------------------------------------------------------
// API Credit Reservations（付费 Route 的原子积分预留）
//
// active：上游正在执行；pending：上游成功，等待持久化扣费；
// dead_letter：重试耗尽，冻结额度等待人工处理。
// ------------------------------------------------------------------
export const apiCreditReservations = pgTable('api_credit_reservations', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  apiKeyId: integer('api_key_id').notNull(),
  routeId: uuid('route_id').notNull(),
  apiCallId: bigint('api_call_id', { mode: 'number' }),
  requestId: uuid('request_id').notNull(),
  amount: integer('amount').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  attempts: integer('attempts').notNull().default(0),
  lastError: varchar('last_error', { length: 500 }),
  lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
  nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date())
}, table => [
  index('api_credit_reservations_user_status_idx').on(table.userId, table.status),
  index('api_credit_reservations_status_next_attempt_idx').on(table.status, table.nextAttemptAt),
  index('api_credit_reservations_created_idx').on(table.createdAt),
  index('api_credit_reservations_request_idx').on(table.requestId),
  index('api_credit_reservations_route_idx').on(table.routeId),
  check('api_credit_reservations_amount_chk', sql`${table.amount} > 0`),
  check('api_credit_reservations_status_chk', sql`${table.status} in ('active', 'pending', 'dead_letter')`),
  check('api_credit_reservations_attempts_chk', sql`${table.attempts} >= 0`)
])

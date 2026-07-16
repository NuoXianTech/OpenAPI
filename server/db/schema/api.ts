import {
  pgTable,
  serial,
  varchar,
  integer,
  text,
  boolean,
  jsonb,
  timestamp,
  uuid,
  index,
  uniqueIndex,
  check
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { users } from './user'

// ------------------------------------------------------------------
// API Categories（公共接口分类）
//
// 分类可被 admin 软删（deletedAt），用以在 admin 列表中标记"已停用"，
// 但与之关联的 apis.categoryId 在分类硬删时会被 set null。
// ------------------------------------------------------------------
export const apiCategories = pgTable('api_categories', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  icon: varchar('icon', { length: 120 }),
  color: varchar('color', { length: 20 }),
  parentId: integer('parent_id'),
  sortOrder: integer('sort_order').notNull().default(0),
  isEnabled: boolean('is_enabled').notNull().default(true),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date())
}, table => [
  uniqueIndex('api_categories_code_uq').on(table.code),
  index('api_categories_parent_sort_idx').on(table.parentId, table.sortOrder),
  index('api_categories_enabled_sort_idx').on(table.isEnabled, table.sortOrder)
])

// ------------------------------------------------------------------
// APIs（公共接口注册表 · 永不物理删除）
//
// 接口由 manifestSync 从 server/routes/v{N}/{code} 自动注册，
// 治理字段（isEnabled / methodCosts / categoryId 等）由 admin 后台维护。
//
// 物理删除文件夹（orphan）行为：
//   - manifestSync 检测到 manifest 中无对应文件夹时，把行标记为 isOrphaned=true
//     并强制 isEnabled=false / isStatistics=false
//   - admin 后台仍可修改 categoryId / 元数据，但不可重新启用
//   - 文件夹回归（且同名 + endpoint 方法集匹配）时，manifestSync 自动清除 isOrphaned
//
// createdBy / updatedBy 用作"操作者快照"，无外键约束：
//   - null = 系统任务或无操作者快照
//   - 整数 = users.id 快照
// ------------------------------------------------------------------
export const apis = pgTable('apis', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull(),
  pathVersion: varchar('path_version', { length: 8 }).notNull().default('v1'),
  endpointCount: integer('endpoint_count').notNull().default(0),
  name: varchar('name', { length: 100 }).notNull(),
  status: integer('status').default(4).notNull(),
  categoryId: integer('category_id').references(() => apiCategories.id, { onDelete: 'set null' }),
  shortDesc: varchar('short_desc', { length: 50 }).notNull(),
  description: text('description').notNull(),
  httpMethod: varchar('http_method', { length: 50 }).notNull(),
  apiPath: varchar('api_path', { length: 200 }).notNull(),
  docUrl: varchar('doc_url', { length: 200 }).notNull(),

  isEnabled: boolean('is_enabled').default(false).notNull(),
  isApiKey: boolean('is_api_key').default(false).notNull(),
  isStatistics: boolean('is_statistics').default(false).notNull(),
  // 文件夹物理删除后被 manifestSync 置为 true；为 true 时拒绝启用，admin 仍可改分类
  isOrphaned: boolean('is_orphaned').default(false).notNull(),

  rateLimitPerSecond: integer('rate_limit_per_second').default(0).notNull(),
  rateLimitPerMinute: integer('rate_limit_per_minute').default(0).notNull(),
  rateLimitPerHour: integer('rate_limit_per_hour').default(0).notNull(),
  rateLimitPerDay: integer('rate_limit_per_day').default(0).notNull(),

  methodCosts: jsonb('method_costs').$type<Record<string, number>>().notNull().default({}),
  capabilityConfig: jsonb('capability_config').$type<Record<string, unknown>>().notNull().default({}),
  capabilityRevision: integer('capability_revision').notNull().default(0),
  capabilityUpdatedAt: timestamp('capability_updated_at', { withTimezone: true }),
  dailyQuota: integer('daily_quota').default(0).notNull(),
  timeoutMs: integer('timeout_ms').default(10000).notNull(),

  createdBy: integer('created_by'), // 操作者快照，null = admin
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedBy: integer('updated_by'), // 操作者快照，null = admin
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date())
}, table => [
  uniqueIndex('apis_version_code_uq').on(table.pathVersion, table.code),
  index('apis_category_idx').on(table.categoryId),
  index('apis_enabled_idx').on(table.isEnabled),
  index('apis_status_idx').on(table.status),
  index('apis_orphaned_idx').on(table.isOrphaned),
  index('apis_path_version_enabled_idx').on(table.pathVersion, table.isEnabled)
])

// ------------------------------------------------------------------
// API Keys（用户 API 密钥）
//
// userId cascade：用户硬删时自动清除该用户所有密钥。
// ------------------------------------------------------------------
export const apiKeys = pgTable('api_keys', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  apiKey: varchar('api_key', { length: 120 }).notNull().unique(),
  isActive: boolean('is_active').notNull().default(true),

  scopes: jsonb('scopes').$type<string[]>(),
  ipWhitelist: jsonb('ip_whitelist').$type<string[]>(),
  totalQuota: integer('total_quota'),
  usedCredits: integer('used_credits').notNull().default(0),
  totalCalls: integer('total_calls').notNull().default(0),

  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  lastUsedIp: varchar('last_used_ip', { length: 45 }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date())
}, table => [
  index('api_keys_user_idx').on(table.userId),
  index('api_keys_active_idx').on(table.isActive),
  index('api_keys_expires_idx').on(table.expiresAt)
])

// ------------------------------------------------------------------
// API Calls（调用日志 · 审计不可变）
//
// userId / apiKeyId 是整数快照，无外键约束：
//   - userId = null 表示匿名调用（接口未开启 isApiKey）
//   - apiKeyId / apiKeyName：apiKeyId 整数快照，apiKeyName 名称快照
//   - 用户硬删 / 密钥删除时本表行保留，对应需求 #5
// apiId 保留外键：apis 行永不物理删除（最多被标记 isOrphaned），FK 仅做防御性约束。
//
// 调用日志写入规则（参见 docs/api/call-statistics.md）：
//   - 接口未开启 isStatistics → 不写
//   - 接口被禁用（isEnabled=false / API_DISABLED）→ 不写
//   - 密钥无效（INVALID_API_KEY / MISSING_API_KEY）→ 不写
//   - 其他场景（成功 + 业务失败 + 配额/积分/到期/吊销拒绝）→ 写入，
//     其中"业务可见拒绝"的 isCounted=false（不参与统计聚合）
// ------------------------------------------------------------------
export const apiCalls = pgTable('api_calls', {
  id: serial('id').primaryKey(),
  requestId: uuid('request_id').defaultRandom().notNull(),
  apiId: integer('api_id').references(() => apis.id, { onDelete: 'restrict' }).notNull(),
  apiKeyId: integer('api_key_id'), // 快照，无 FK
  apiKeyName: varchar('api_key_name', { length: 100 }), // 名称快照（删除密钥后仍可读）
  userId: integer('user_id'), // 用户 id 快照，无 FK；null = 匿名
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
  // false = 业务可见拒绝（配额/积分/密钥到期/密钥被禁用），写日志但不进 stats 聚合
  isCounted: boolean('is_counted').notNull().default(true),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, table => [
  index('api_calls_created_at_idx').on(table.createdAt.desc()),
  index('api_calls_api_id_created_at_idx').on(table.apiId, table.createdAt.desc()),
  index('api_calls_user_created_at_idx').on(table.userId, table.createdAt.desc()),
  index('api_calls_api_key_created_at_idx').on(table.apiKeyId, table.createdAt.desc()),
  index('api_calls_status_idx').on(table.statusCode),
  index('api_calls_request_id_idx').on(table.requestId)
])

// ------------------------------------------------------------------
// API Call Stats（按 apiId × 自然日聚合 · 统计源）
//
// 仅在 apiCalls.isCounted=true 时累加；orphan / disabled / isStatistics=false
// 的接口完全不会进入本表。dashboard / 单接口日统计/总统计聚合均基于本表。
// ------------------------------------------------------------------
export const apiCallStats = pgTable('api_call_stats', {
  id: serial('id').primaryKey(),
  apiId: integer('api_id').notNull().references(() => apis.id),
  statDate: timestamp('stat_date', { withTimezone: true }).notNull(),
  totalCount: integer('total_count').notNull().default(0),
  successCount: integer('success_count').notNull().default(0),
  failureCount: integer('failure_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date())
}, table => [
  uniqueIndex('api_call_stats_api_id_stat_date_uq').on(table.apiId, table.statDate),
  index('api_call_stats_stat_date_idx').on(table.statDate)
])

// ------------------------------------------------------------------
// API Daily Quota Usage（每日配额原子计数器）
//
// 与 apiCallStats 分离：配额在 handler 执行前原子预占，而调用统计在响应后写入。
// 这样即使关闭统计或运行多个实例，每日配额仍能严格执行且不会竞态超发。
// ------------------------------------------------------------------
export const apiDailyQuotaUsage = pgTable('api_daily_quota_usage', {
  id: serial('id').primaryKey(),
  apiId: integer('api_id').notNull().references(() => apis.id, { onDelete: 'cascade' }),
  usageDate: timestamp('usage_date', { withTimezone: true }).notNull(),
  usedCount: integer('used_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date())
}, table => [
  uniqueIndex('api_daily_quota_usage_api_id_date_uq').on(table.apiId, table.usageDate),
  index('api_daily_quota_usage_date_idx').on(table.usageDate)
])

// ------------------------------------------------------------------
// Pending Charges（扣费补偿队列）
//
// charge 失败时入队，pendingChargesRetry 定时重试。
// 用户硬删时 cascade 清理（无法对已删除用户扣费）。
// ------------------------------------------------------------------
export const pendingCharges = pgTable('pending_charges', {
  id: serial('id').primaryKey(),
  apiCallId: integer('api_call_id').notNull().references(() => apiCalls.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  apiId: integer('api_id').notNull().references(() => apis.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  remark: varchar('remark', { length: 500 }),
  attempts: integer('attempts').notNull().default(0),
  lastError: varchar('last_error', { length: 500 }),
  lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
  nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).notNull().defaultNow(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date())
}, table => [
  uniqueIndex('pending_charges_api_call_uq').on(table.apiCallId),
  index('pending_charges_status_next_attempt_idx').on(table.status, table.nextAttemptAt),
  index('pending_charges_user_idx').on(table.userId),
  check('pending_charges_status_chk', sql`${table.status} in ('pending', 'dead_letter')`)
])

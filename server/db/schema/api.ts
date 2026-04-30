import {
  pgTable,
  serial,
  varchar,
  integer,
  text,
  boolean,
  jsonb,
  bigint,
  timestamp,
  uuid,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { users } from './user'

// ------------------------------------------------------------------
// API Categories（结构化分类，支持二级父子）
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
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, table => [
  uniqueIndex('api_categories_code_uq').on(table.code),
  index('api_categories_parent_sort_idx').on(table.parentId, table.sortOrder),
  index('api_categories_enabled_sort_idx').on(table.isEnabled, table.sortOrder),
])

// ------------------------------------------------------------------
// APIs（接口主表）
//
// 治理粒度：一条记录 = 一个 (pathVersion, code) = server/routes/v{N}/<code>/ 目录。
// 该 code 下所有 endpoints（不同 HTTP 方法、子路径、动态路由）共享同一份治理配置。
// 子路由明细由构建期 manifest 提供，DB 不重复存储。
// ------------------------------------------------------------------
export const apis = pgTable('apis', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull(), // = server/routes/v{N}/<code>/ 目录名
  pathVersion: varchar('path_version', { length: 8 }).notNull().default('v1'),
  sourceDir: varchar('source_dir', { length: 500 }), // 源目录相对路径，展示与一致性校验用
  endpointCount: integer('endpoint_count').notNull().default(0), // 下辖 endpoints 数量，admin 行展示
  name: varchar('name', { length: 100 }).notNull(),
  status: integer('status').default(1).notNull(), // -1=未知 0=异常 1=正常 2=维护 3=废弃
  categoryId: integer('category_id').references(() => apiCategories.id, { onDelete: 'set null' }),
  shortDesc: varchar('short_desc', { length: 30 }).notNull(),
  description: text('description').notNull(),
  httpMethod: varchar('http_method', { length: 50 }).notNull(), // 可逗号分隔
  apiPath: varchar('api_path', { length: 200 }).notNull(), // 基础展示路径，例 /v1/user
  docUrl: varchar('doc_url', { length: 200 }).notNull(),
  thumbnailUrl: varchar('thumbnail_url', { length: 1000 }),
  version: varchar('version', { length: 32 }).notNull().default('v1'), // 文档版本号（与 pathVersion 不同）
  deprecatedAt: timestamp('deprecated_at', { withTimezone: true }),
  replacementCode: varchar('replacement_code', { length: 50 }),

  isEnabled: boolean('is_enabled').default(true).notNull(),
  isApiKey: boolean('is_api_key').default(false).notNull(),
  isStatistics: boolean('is_statistics').default(true).notNull(),
  requiresAuth: boolean('requires_auth').default(false).notNull(),

  // 限流（0 表示不限）
  rateLimitPerSecond: integer('rate_limit_per_second').default(0).notNull(),
  rateLimitPerMinute: integer('rate_limit_per_minute').default(0).notNull(),
  rateLimitPerHour: integer('rate_limit_per_hour').default(0).notNull(),
  rateLimitPerDay: integer('rate_limit_per_day').default(0).notNull(),

  // 配额与性能
  costCredits: integer('cost_credits').default(0).notNull(),
  dailyQuota: integer('daily_quota').default(0).notNull(),
  timeoutMs: integer('timeout_ms').default(10000).notNull(),
  cacheTtlSeconds: integer('cache_ttl_seconds').default(0).notNull(),

  // 上游代理
  upstreamUrl: varchar('upstream_url', { length: 1000 }),
  upstreamTimeoutMs: integer('upstream_timeout_ms'),

  // 文档 schema 与示例
  paramsSchema: jsonb('params_schema').$type<Record<string, unknown>>(),
  responseSchema: jsonb('response_schema').$type<Record<string, unknown>>(),
  exampleRequest: jsonb('example_request').$type<Record<string, unknown>>(),
  exampleResponse: jsonb('example_response').$type<Record<string, unknown>>(),

  totalCalls: bigint('total_calls', { mode: 'number' }).notNull().default(0),
  sortOrder: integer('sort_order').notNull().default(0),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),

  createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedBy: integer('updated_by').references(() => users.id, { onDelete: 'set null' }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, table => [
  uniqueIndex('apis_version_code_uq').on(table.pathVersion, table.code),
  index('api_lists_category_idx').on(table.categoryId),
  index('api_lists_enabled_sort_idx').on(table.isEnabled, table.sortOrder),
  index('api_lists_status_idx').on(table.status),
  index('api_lists_deleted_at_idx').on(table.deletedAt),
  index('apis_path_version_enabled_idx').on(table.pathVersion, table.isEnabled),
])

// ------------------------------------------------------------------
// API Keys（用户签发的访问密钥）
// ------------------------------------------------------------------
export const apiKeys = pgTable('api_keys', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  apiKey: varchar('api_key', { length: 120 }).notNull().unique(),
  isActive: boolean('is_active').notNull().default(true),

  scopes: jsonb('scopes').$type<string[]>(), // null / [] = 全部
  ipWhitelist: jsonb('ip_whitelist').$type<string[]>(),
  refererWhitelist: jsonb('referer_whitelist').$type<string[]>(),
  dailyQuota: integer('daily_quota').notNull().default(0),
  totalCalls: bigint('total_calls', { mode: 'number' }).notNull().default(0),

  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  lastUsedIp: varchar('last_used_ip', { length: 45 }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, table => [
  index('api_keys_user_idx').on(table.userId),
  index('api_keys_active_idx').on(table.isActive),
  index('api_keys_expires_idx').on(table.expiresAt),
])

// ------------------------------------------------------------------
// API Calls（单次调用明细日志）
// ------------------------------------------------------------------
export const apiCalls = pgTable('api_calls', {
  id: serial('id').primaryKey(),
  requestId: uuid('request_id').defaultRandom(), // 分布式追踪 ID
  apiId: integer('api_id').references(() => apis.id).notNull(),
  apiKeyId: integer('api_key_id').references(() => apiKeys.id),
  userId: integer('user_id').references(() => users.id),
  path: varchar('path', { length: 1000 }).notNull(),
  method: varchar('method', { length: 10 }).notNull(),
  queryString: varchar('query_string', { length: 2000 }),
  apiVersion: varchar('api_version', { length: 32 }),

  statusCode: integer('status_code').notNull(),
  latencyMs: integer('latency_ms').notNull().default(0),
  upstreamStatusCode: integer('upstream_status_code'),
  upstreamLatencyMs: integer('upstream_latency_ms'),
  cacheHit: boolean('cache_hit').notNull().default(false),

  ip: varchar('ip', { length: 45 }),
  country: varchar('country', { length: 2 }),
  region: varchar('region', { length: 100 }),
  city: varchar('city', { length: 100 }),
  userAgent: varchar('user_agent', { length: 500 }),
  referer: varchar('referer', { length: 1000 }),

  requestSize: integer('request_size'),
  responseSize: integer('response_size'),
  requestSnapshot: jsonb('request_snapshot').$type<Record<string, unknown>>(), // 结构化请求快照（按采样率写入）

  errorCode: varchar('error_code', { length: 50 }),
  errorMessage: varchar('error_message', { length: 500 }),

  // 此次调用扣除的余额。0 表示免费 / 失败未扣 / 已退款
  creditsCost: integer('credits_cost').notNull().default(0),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  index('api_calls_created_at_idx').on(table.createdAt),
  index('api_calls_api_id_created_at_idx').on(table.apiId, table.createdAt),
  index('api_calls_user_created_at_idx').on(table.userId, table.createdAt),
  index('api_calls_api_key_created_at_idx').on(table.apiKeyId, table.createdAt),
  index('api_calls_status_idx').on(table.statusCode),
  index('api_calls_request_id_idx').on(table.requestId),
])

// ------------------------------------------------------------------
// API Call Stats（按 api × 天聚合）
// ------------------------------------------------------------------
export const apiCallStats = pgTable('api_call_stats', {
  id: serial('id').primaryKey(),
  apiId: integer('api_id').notNull().references(() => apis.id),
  lastApiCallId: integer('last_api_call_id').references(() => apiCalls.id), // 该统计区间最近一次调用 ID
  statDate: timestamp('stat_date', { withTimezone: true }).notNull(),
  totalCount: integer('total_count').notNull().default(0),
  successCount: integer('success_count').notNull().default(0),
  failureCount: integer('failure_count').notNull().default(0),
  apiPath: varchar('api_path', { length: 200 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, table => [
  uniqueIndex('api_call_stats_api_id_stat_date_uq').on(table.apiId, table.statDate),
  index('api_call_stats_stat_date_idx').on(table.statDate),
])

// ------------------------------------------------------------------
// API Rate Limit Buckets（限流桶，postgres driver 使用）
//
// 滑动窗口的"固定桶"近似实现：按 windowStart 对齐时间窗，同一 (bucketKey, windowStart)
// 用 upsert 原子累加 count。driver 查询当前桶 count 并判断是否超额。
// 清理由后台定时任务删除过期窗口，避免无限增长。
// ------------------------------------------------------------------
export const apiRateLimitBuckets = pgTable('api_rate_limit_buckets', {
  id: serial('id').primaryKey(),
  bucketKey: varchar('bucket_key', { length: 200 }).notNull(),
  windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
  count: integer('count').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, table => [
  uniqueIndex('api_rate_limit_buckets_key_window_uq').on(table.bucketKey, table.windowStart),
  index('api_rate_limit_buckets_window_idx').on(table.windowStart),
])

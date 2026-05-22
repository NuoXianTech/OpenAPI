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
  check
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { users } from './user'

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

export const apis = pgTable('apis', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull(),
  pathVersion: varchar('path_version', { length: 8 }).notNull().default('v1'),
  endpointCount: integer('endpoint_count').notNull().default(0),
  name: varchar('name', { length: 100 }).notNull(),
  status: integer('status').default(1).notNull(),
  categoryId: integer('category_id').references(() => apiCategories.id, { onDelete: 'set null' }),
  shortDesc: varchar('short_desc', { length: 30 }).notNull(),
  description: text('description').notNull(),
  httpMethod: varchar('http_method', { length: 50 }).notNull(),
  apiPath: varchar('api_path', { length: 200 }).notNull(),
  docUrl: varchar('doc_url', { length: 200 }).notNull(),
  docVersion: varchar('doc_version', { length: 32 }).notNull().default('v1'),

  isEnabled: boolean('is_enabled').default(true).notNull(),
  isApiKey: boolean('is_api_key').default(false).notNull(),
  isStatistics: boolean('is_statistics').default(true).notNull(),

  rateLimitPerSecond: integer('rate_limit_per_second').default(0).notNull(),
  rateLimitPerMinute: integer('rate_limit_per_minute').default(0).notNull(),
  rateLimitPerHour: integer('rate_limit_per_hour').default(0).notNull(),
  rateLimitPerDay: integer('rate_limit_per_day').default(0).notNull(),

  methodCosts: jsonb('method_costs').$type<Record<string, number>>().notNull().default({}),
  dailyQuota: integer('daily_quota').default(0).notNull(),
  timeoutMs: integer('timeout_ms').default(10000).notNull(),

  createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedBy: integer('updated_by').references(() => users.id, { onDelete: 'set null' }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date())
}, table => [
  uniqueIndex('apis_version_code_uq').on(table.pathVersion, table.code),
  index('apis_category_idx').on(table.categoryId),
  index('apis_enabled_idx').on(table.isEnabled),
  index('apis_status_idx').on(table.status),
  index('apis_path_version_enabled_idx').on(table.pathVersion, table.isEnabled)
])

export const apiKeys = pgTable('api_keys', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  apiKey: varchar('api_key', { length: 120 }).notNull().unique(),
  isActive: boolean('is_active').notNull().default(true),

  scopes: jsonb('scopes').$type<string[]>(),
  ipWhitelist: jsonb('ip_whitelist').$type<string[]>(),
  totalQuota: bigint('total_quota', { mode: 'number' }),
  usedCredits: bigint('used_credits', { mode: 'number' }).notNull().default(0),
  totalCalls: bigint('total_calls', { mode: 'number' }).notNull().default(0),

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

export const apiCalls = pgTable('api_calls', {
  id: serial('id').primaryKey(),
  requestId: uuid('request_id').defaultRandom(),
  apiId: integer('api_id').references(() => apis.id, { onDelete: 'restrict' }).notNull(),
  apiKeyId: integer('api_key_id').references(() => apiKeys.id),
  apiKeyName: varchar('api_key_name', { length: 100 }),
  userId: integer('user_id').references(() => users.id),
  path: varchar('path', { length: 1000 }).notNull(),
  method: varchar('method', { length: 10 }).notNull(),
  queryString: varchar('query_string', { length: 2000 }),

  statusCode: integer('status_code').notNull(),
  latencyMs: integer('latency_ms').notNull().default(0),

  ip: varchar('ip', { length: 45 }),
  country: varchar('country', { length: 2 }),
  region: varchar('region', { length: 100 }),
  city: varchar('city', { length: 100 }),
  userAgent: varchar('user_agent', { length: 500 }),
  referer: varchar('referer', { length: 1000 }),

  requestSize: integer('request_size'),
  responseSize: integer('response_size'),

  errorCode: varchar('error_code', { length: 50 }),
  errorMessage: varchar('error_message', { length: 500 }),

  creditsCost: integer('credits_cost').notNull().default(0),
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

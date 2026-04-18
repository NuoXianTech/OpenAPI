import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core'
import { users } from './user'

// ------------------------------------------------------------------
// Site Settings（全站配置，单行 scope=default）
// ------------------------------------------------------------------
export const siteSettings = pgTable('site_settings', {
  id: serial('id').primaryKey(),
  scope: varchar('scope', { length: 32 }).notNull().default('default').unique(),

  // 基础信息
  siteUrl: varchar('site_url', { length: 1000 }).notNull().default('http://localhost:3000'),
  siteImg: varchar('site_img', { length: 1000 }).notNull().default('https://q1.qlogo.cn/g?b=qq&nk=1428309052&s=640'),
  siteName: varchar('site_name', { length: 140 }).notNull().default('OpenAPI'),
  siteDescription: text('site_description').notNull().default('OpenAPI是免费为用户提供网络数据接口调用的服务平台。'),
  startTime: varchar('start_time', { length: 32 }).notNull().default('2026-01-01 00:00:00'),

  // 注册
  registrationMode: varchar('registration_mode', { length: 20 }).notNull().default('open'), // open / invite / closed
  loginAttemptsLimit: integer('login_attempts_limit').notNull().default(5),
  loginLockMinutes: integer('login_lock_minutes').notNull().default(30),

  // 会话 / 验证
  sessionMaxAgeSeconds: integer('session_max_age_seconds').notNull().default(60 * 60 * 24 * 7),
  emailVerifyExpiresInMinutes: integer('email_verify_expires_in_minutes').notNull().default(30),
  passwordResetExpiresInMinutes: integer('password_reset_expires_in_minutes').notNull().default(30),

  // 备案与法务
  icpBeian: varchar('icp_beian', { length: 100 }),
  policeBeian: varchar('police_beian', { length: 100 }),
  termsUrl: varchar('terms_url', { length: 1000 }),
  privacyUrl: varchar('privacy_url', { length: 1000 }),

  // API 日志采样与保留
  apiLogSamplingRate: integer('api_log_sampling_rate').notNull().default(100),
  apiLogRetentionDays: integer('api_log_retention_days').notNull().default(90),

  // SMTP（保留兼容）
  smtpHost: varchar('smtp_host', { length: 255 }).notNull().default('smtp.example.com'),
  smtpPort: integer('smtp_port').notNull().default(465),
  smtpSecure: boolean('smtp_secure').notNull().default(true),
  smtpUser: varchar('smtp_user', { length: 255 }).notNull().default(''),
  smtpPass: varchar('smtp_pass', { length: 255 }).notNull().default(''),
  smtpFrom: varchar('smtp_from', { length: 255 }).notNull().default('no-reply@example.com'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
})

// ------------------------------------------------------------------
// Operation Logs（后台审计日志）
// ------------------------------------------------------------------
export const operationLogs = pgTable('operation_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  actor: varchar('actor', { length: 140 }), // 冗余字段，用户被删后仍可追溯
  actorType: varchar('actor_type', { length: 20 }).notNull().default('user'), // user / admin / system
  action: varchar('action', { length: 80 }).notNull(), // e.g. user.ban / api.update
  resourceType: varchar('resource_type', { length: 80 }),
  resourceId: varchar('resource_id', { length: 120 }),
  ip: varchar('ip', { length: 45 }),
  userAgent: varchar('user_agent', { length: 500 }),
  detail: jsonb('detail').$type<Record<string, unknown>>(),
  status: varchar('status', { length: 20 }).notNull().default('success'),
  errorMessage: varchar('error_message', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  index('operation_logs_created_at_idx').on(table.createdAt),
  index('operation_logs_user_created_idx').on(table.userId, table.createdAt),
  index('operation_logs_action_idx').on(table.action),
  index('operation_logs_resource_idx').on(table.resourceType, table.resourceId),
])

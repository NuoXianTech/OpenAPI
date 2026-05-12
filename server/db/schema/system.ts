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
  siteImg: varchar('site_img', { length: 1000 }).notNull().default('/favicon.ico'),
  siteName: varchar('site_name', { length: 140 }).notNull().default('OpenAPI'),
  siteDescription: text('site_description').notNull().default('OpenAPI是免费为用户提供网络数据接口调用的服务平台。'),
  startTime: varchar('start_time', { length: 32 }).notNull().default('2026-01-01 00:00:00'),

  // 注册
  registrationMode: varchar('registration_mode', { length: 20 }).notNull().default('open'), // open / invite / closed
  // 注册邮箱域名过滤：off=不过滤；whitelist=只允许列表内域名；blacklist=拒绝列表内域名
  registerEmailFilterMode: varchar('register_email_filter_mode', { length: 20 }).notNull().default('off'),
  // 注册邮箱域名过滤列表（逗号或换行分隔，例如：163.com,qq.com）。filterMode=off 时此字段被忽略；
  // filterMode=whitelist 时作为白名单使用；filterMode=blacklist 时作为黑名单使用。
  registerEmailFilterList: text('register_email_filter_list').notNull().default(''),

  // 会话 / 验证
  // 默认会话有效期：未勾选「记住我」时使用，按秒；登录后会随活跃滑动续期
  sessionMaxAgeSeconds: integer('session_max_age_seconds').notNull().default(60 * 60 * 24),
  // 滑动会话的绝对硬顶：从首次登录算，超过此值无论是否活跃都强制重新登录
  // 仅约束未勾选「记住我」的会话；勾选后由 sessionRememberMaxAgeSeconds 自身充当上限
  sessionAbsoluteMaxAgeSeconds: integer('session_absolute_max_age_seconds').notNull().default(60 * 60 * 24 * 7),
  // 「记住我」会话有效期：勾选后使用，按秒；不滑动续期，到期重新登录
  sessionRememberMaxAgeSeconds: integer('session_remember_max_age_seconds').notNull().default(60 * 60 * 24 * 30),
  emailVerifyExpiresInMinutes: integer('email_verify_expires_in_minutes').notNull().default(30),
  passwordResetExpiresInMinutes: integer('password_reset_expires_in_minutes').notNull().default(30),
  // 忘记密码功能总开关：关闭后，请求重置邮件 / 消费重置 token 都会被拒，登录页也不展示入口
  passwordResetEnabled: boolean('password_reset_enabled').notNull().default(true),

  // 备案与法务
  icpBeian: varchar('icp_beian', { length: 100 }),
  policeBeian: varchar('police_beian', { length: 100 }),
  termsUrl: varchar('terms_url', { length: 1000 }),
  privacyUrl: varchar('privacy_url', { length: 1000 }),

  // SMTP（保留兼容）
  smtpHost: varchar('smtp_host', { length: 255 }).notNull().default('smtp.example.com'),
  smtpPort: integer('smtp_port').notNull().default(465),
  smtpSecure: boolean('smtp_secure').notNull().default(true),
  smtpUser: varchar('smtp_user', { length: 255 }).notNull().default(''),
  smtpPass: varchar('smtp_pass', { length: 255 }).notNull().default(''),
  smtpFrom: varchar('smtp_from', { length: 255 }).notNull().default('no-reply@example.com'),

  // 第三方登录总开关
  oauthLoginEnabled: boolean('oauth_login_enabled').notNull().default(true),
  // 强制绑定：开启后，OAuth 登录不再自动创建新用户，必须命中已有账号（通过已绑定的 provider_user_id 或同邮箱）
  oauthForceBinding: boolean('oauth_force_binding').notNull().default(false),

  // Cloudflare Turnstile 人机验证
  turnstileEnabled: boolean('turnstile_enabled').notNull().default(false),
  turnstileSiteKey: varchar('turnstile_site_key', { length: 200 }).notNull().default(''),
  // 密文存储（AES-GCM），复用 oauthCrypto encryptSecret/decryptSecret
  turnstileSecretKey: varchar('turnstile_secret_key', { length: 500 }).notNull().default(''),
  turnstileLoginEnabled: boolean('turnstile_login_enabled').notNull().default(true),
  turnstileRegisterEnabled: boolean('turnstile_register_enabled').notNull().default(true),
  turnstileAdminLoginEnabled: boolean('turnstile_admin_login_enabled').notNull().default(true),
  turnstilePublicStatsEnabled: boolean('turnstile_public_stats_enabled').notNull().default(false),
  turnstilePasswordResetEnabled: boolean('turnstile_password_reset_enabled').notNull().default(true),

  // 首页公告弹窗开关（默认关闭，避免打扰；后台用通知铃铛常驻入口，无需开关）
  announcementShowOnHome: boolean('announcement_show_on_home').notNull().default(false),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
})

// ------------------------------------------------------------------
// Operation Logs（后台审计日志）
// ------------------------------------------------------------------
export const operationLogs = pgTable('operation_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  actor: varchar('actor', { length: 140 }), // 冗余字段，用户被删后仍可追溯（admin 操作 userId 为 NULL）
  action: varchar('action', { length: 80 }).notNull(), // e.g. admin.user.ban / user.password.change
  resourceType: varchar('resource_type', { length: 80 }),
  resourceId: varchar('resource_id', { length: 120 }),
  ip: varchar('ip', { length: 45 }),
  userAgent: varchar('user_agent', { length: 500 }),
  detail: jsonb('detail').$type<Record<string, unknown>>(),
  status: varchar('status', { length: 20 }).notNull().default('success'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  index('operation_logs_created_at_idx').on(table.createdAt),
  index('operation_logs_user_created_idx').on(table.userId, table.createdAt),
  index('operation_logs_action_idx').on(table.action),
  index('operation_logs_resource_idx').on(table.resourceType, table.resourceId),
])

import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  index
} from 'drizzle-orm/pg-core'
import { PUBLIC_SITE_DEFAULTS } from '~~/shared/config/site-defaults'
import { users } from './user'

// ------------------------------------------------------------------
// Site Settings（全站配置，单行 scope=default）
// ------------------------------------------------------------------
export const siteSettings = pgTable('site_settings', {
  id: serial('id').primaryKey(),
  scope: varchar('scope', { length: 32 }).notNull().default('default').unique(),

  // 基础信息
  siteUrl: varchar('site_url', { length: 1000 }).notNull().default(PUBLIC_SITE_DEFAULTS.siteUrl),
  siteImg: varchar('site_img', { length: 1000 }).notNull().default(PUBLIC_SITE_DEFAULTS.siteImg),
  siteName: varchar('site_name', { length: 140 }).notNull().default(PUBLIC_SITE_DEFAULTS.siteName),
  siteDescription: text('site_description').notNull().default(PUBLIC_SITE_DEFAULTS.siteDescription),
  startTime: varchar('start_time', { length: 32 }).notNull().default(PUBLIC_SITE_DEFAULTS.startTime),

  // 注册
  registrationMode: varchar('registration_mode', { length: 20 }).notNull().default('open'), // open / invite / closed
  // 新注册用户的默认积分。> 0 时激活流程会发一条 reason='signup_bonus' 的积分流水。
  defaultRegisterCredits: integer('default_register_credits').notNull().default(0),
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
  // 邮件激活总开关：开启=注册后须点邮件链接激活（isActive=false 起步）；关闭=注册即激活、不发验证邮件
  emailActivationEnabled: boolean('email_activation_enabled').notNull().default(true),
  passwordResetExpiresInMinutes: integer('password_reset_expires_in_minutes').notNull().default(30),
  // 忘记密码功能总开关：关闭后，请求重置邮件 / 消费重置 token 都会被拒，登录页也不展示入口
  passwordResetEnabled: boolean('password_reset_enabled').notNull().default(PUBLIC_SITE_DEFAULTS.passwordResetEnabled),

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
  // 发件人显示名：非空时发信头形如 "显示名 <smtpFrom>"；留空则只用地址
  smtpFromName: varchar('smtp_from_name', { length: 255 }).notNull().default(''),
  // 回信邮箱（Reply-To）：留空则不设置，用户回信默认回到 smtpFrom
  smtpReplyTo: varchar('smtp_reply_to', { length: 255 }).notNull().default(''),
  // SMTP 连接复用窗口（秒）：>0 时启用连接池并在该秒数后重建连接；0=每封新建即关闭（不复用）
  smtpPoolMaxAgeSeconds: integer('smtp_pool_max_age_seconds').notNull().default(0),

  // 强制绑定：开启后，第三方登录遇到未注册的身份只允许「绑定已有账号」，不允许新注册
  oauthForceBinding: boolean('oauth_force_binding').notNull().default(false),

  // 第三方登录 · 各 provider 应用配置
  // clientSecret 明文存储（与 turnstileSecretKey / smtpPass 一致，后台 UI 写时覆盖）。
  // provider 白名单固定在 shared/types/oauth.ts；扩 provider 时在此加列并同步 oauthProviderService 的列映射。
  oauthGithubClientId: varchar('oauth_github_client_id', { length: 255 }).notNull().default(''),
  oauthGithubClientSecret: varchar('oauth_github_client_secret', { length: 255 }).notNull().default(''),
  oauthGithubEnabled: boolean('oauth_github_enabled').notNull().default(false),
  oauthQqClientId: varchar('oauth_qq_client_id', { length: 255 }).notNull().default(''),
  oauthQqClientSecret: varchar('oauth_qq_client_secret', { length: 255 }).notNull().default(''),
  oauthQqEnabled: boolean('oauth_qq_enabled').notNull().default(false),

  // Cloudflare Turnstile 人机验证（无总开关：配置 Site Key + Secret Key 后，由各「验证场景」开关分别决定是否生效）
  turnstileSiteKey: varchar('turnstile_site_key', { length: 200 }).notNull().default(''),
  // 明文存储；后台 UI 直接展示
  turnstileSecretKey: varchar('turnstile_secret_key', { length: 200 }).notNull().default(''),
  turnstileLoginEnabled: boolean('turnstile_login_enabled').notNull().default(false),
  turnstileRegisterEnabled: boolean('turnstile_register_enabled').notNull().default(false),
  turnstileAdminLoginEnabled: boolean('turnstile_admin_login_enabled').notNull().default(false),
  turnstilePasswordResetEnabled: boolean('turnstile_password_reset_enabled').notNull().default(false),
  // 每日签到页是否要求 Turnstile（弹窗内验证）
  turnstileCheckinEnabled: boolean('turnstile_checkin_enabled').notNull().default(false),

  // ----------------------------------------------------------------
  // 每日签到
  // checkinCooldownMode: 'hours' = 距上次签到 N 小时后才能再签；
  //                      'fixed_time' = 每日固定 HH:mm 刷新（如 '00:00'）
  // checkinRefreshHours: 仅 cooldownMode='hours' 时使用
  // checkinFixedRefreshTime: 'HH:mm'，仅 cooldownMode='fixed_time' 时使用
  // checkinMode: 'fixed' 固定积分；'range' 在 [min, max] 之间随机取整
  // ----------------------------------------------------------------
  checkinEnabled: boolean('checkin_enabled').notNull().default(true),
  checkinCooldownMode: varchar('checkin_cooldown_mode', { length: 20 }).notNull().default('hours'),
  checkinRefreshHours: integer('checkin_refresh_hours').notNull().default(24),
  checkinFixedRefreshTime: varchar('checkin_fixed_refresh_time', { length: 8 }).notNull().default('00:00'),
  checkinMode: varchar('checkin_mode', { length: 20 }).notNull().default('fixed'),
  checkinAmountFixed: integer('checkin_amount_fixed').notNull().default(10),
  checkinAmountMin: integer('checkin_amount_min').notNull().default(5),
  checkinAmountMax: integer('checkin_amount_max').notNull().default(20),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date())
})

// ------------------------------------------------------------------
// Operation Logs（后台审计日志 · 审计不可变）
//
// userId 是 users.id 整数快照，无外键约束：
//   - null = admin 内置账号操作（admin 不在 users 表）
//   - 整数 = 实际操作的用户 id 快照（用户硬删后仍保留历史指向）
// actor 是用户名/管理员名快照，用于在用户被硬删后继续可追溯人物姓名。
// ------------------------------------------------------------------
export const operationLogs = pgTable('operation_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'), // null=admin，整数=用户 id 快照（无 FK）
  actor: varchar('actor', { length: 140 }), // 操作者名快照
  action: varchar('action', { length: 80 }).notNull(), // e.g. admin.user.ban / user.password.change
  resourceType: varchar('resource_type', { length: 80 }),
  resourceId: varchar('resource_id', { length: 120 }),
  ip: varchar('ip', { length: 45 }),
  userAgent: varchar('user_agent', { length: 500 }),
  detail: jsonb('detail').$type<Record<string, unknown>>(),
  status: varchar('status', { length: 20 }).notNull().default('success'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, table => [
  index('operation_logs_created_at_idx').on(table.createdAt.desc()),
  index('operation_logs_user_created_idx').on(table.userId, table.createdAt.desc()),
  index('operation_logs_action_idx').on(table.action),
  index('operation_logs_resource_idx').on(table.resourceType, table.resourceId)
])

// ------------------------------------------------------------------
// Login Logs（登录日志 · 跟随用户删除）
//
// 对应需求 #7：仅记录已识别用户的登录尝试（成功 + 失败），userId NOT NULL +
// cascade，用户硬删时这部分历史一并清除。
// method:    password / oauth_github / oauth_qq
// success:   true=登录成功 / false=失败（密码错误、被封禁、未激活等）
// failureReason: 失败时填写（如 invalid_password / banned / not_active）
// ------------------------------------------------------------------
export const loginLogs = pgTable('login_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  method: varchar('method', { length: 32 }).notNull(),
  success: boolean('success').notNull(),
  failureReason: varchar('failure_reason', { length: 100 }),
  ip: varchar('ip', { length: 45 }),
  userAgent: varchar('user_agent', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, table => [
  index('login_logs_user_created_idx').on(table.userId, table.createdAt.desc()),
  index('login_logs_created_at_idx').on(table.createdAt.desc()),
  index('login_logs_method_idx').on(table.method)
])

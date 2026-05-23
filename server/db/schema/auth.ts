import {
  pgTable,
  serial,
  integer,
  varchar,
  boolean,
  timestamp,
  index,
  uniqueIndex
} from 'drizzle-orm/pg-core'
import { users } from './user'

// ------------------------------------------------------------------
// Sessions（用户/管理员会话）
//
// userId nullable：admin 会话 userId=null（admin 不在 users 表）。
// 用户硬删时 FK cascade 自动清除该用户的所有会话。
// ------------------------------------------------------------------
export const sessions = pgTable('sessions', {
  sessionId: varchar('session_id', { length: 128 }).primaryKey(), // sessionId 的哈希值
  kind: varchar('kind', { length: 20 }).notNull().default('user'), // user / admin
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  ip: varchar('ip', { length: 45 }),
  userAgent: varchar('user_agent', { length: 500 }),
  // 「记住我」标记：true=登录时勾选，按 sessionRememberMaxAgeSeconds 一次性给定有效期；false=按 sessionMaxAgeSeconds 滑动续期
  isRemembered: boolean('is_remembered').notNull().default(false),
  lastActiveAt: timestamp('last_active_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, table => [
  index('sessions_user_idx').on(table.userId),
  index('sessions_expires_idx').on(table.expiresAt),
  index('sessions_last_active_idx').on(table.lastActiveAt)
])

// ------------------------------------------------------------------
// Verification tokens（邮箱验证 / 密码重置 / 邮箱变更等一次性 token）
//
// 用户硬删时 FK cascade 自动清除该用户所有未消费 token。
// ------------------------------------------------------------------
export const verificationTokens = pgTable('verification_tokens', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  purpose: varchar('purpose', { length: 20 }).notNull().default('verify'), // verify / reset_password / change_email
  tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
  ip: varchar('ip', { length: 45 }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, table => [
  index('verification_tokens_user_created_idx').on(table.userId, table.createdAt),
  index('verification_tokens_email_idx').on(table.email),
  index('verification_tokens_purpose_idx').on(table.purpose),
  index('verification_tokens_expires_idx').on(table.expiresAt)
])

// ------------------------------------------------------------------
// OAuth provider config（仅支持 GitHub / QQ，显示名/图标/scopes/URL 全部硬编码在 shared/types/oauth.ts 的 OAUTH_PROVIDER_PRESETS；callbackUrl 由 siteUrl 运行时拼）
// clientSecret 应用层 AES-GCM 加密后落库
// ------------------------------------------------------------------
export const oauthProviders = pgTable('oauth_providers', {
  id: serial('id').primaryKey(),
  provider: varchar('provider', { length: 32 }).notNull(),
  clientId: varchar('client_id', { length: 255 }).notNull().default(''),
  clientSecret: varchar('client_secret', { length: 1000 }).notNull().default(''),
  isEnabled: boolean('is_enabled').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date())
}, table => [
  uniqueIndex('oauth_providers_provider_uq').on(table.provider)
])

// ------------------------------------------------------------------
// User third-party account binding（用户三方绑定）
//
// 一个用户可绑定多个第三方账号。本应用 OAuth 仅用于登录身份识别，
// 不调用上游 API，因此不持久化 access_token / refresh_token / scope。
// providerUserId 已经是稳定身份标识。
//
// 用户硬删时 FK cascade 自动清除该用户所有 OAuth 绑定。
// ------------------------------------------------------------------
export const oauthAccounts = pgTable('oauth_accounts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 32 }).notNull(),
  providerUserId: varchar('provider_user_id', { length: 255 }).notNull(), // openId / uid
  nickname: varchar('nickname', { length: 140 }),
  avatarUrl: varchar('avatar_url', { length: 1000 }),
  email: varchar('email', { length: 255 }),
  linkedAt: timestamp('linked_at', { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  lastLoginIp: varchar('last_login_ip', { length: 45 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date())
}, table => [
  uniqueIndex('oauth_accounts_provider_pid_uq').on(table.provider, table.providerUserId),
  index('oauth_accounts_user_idx').on(table.userId),
  index('oauth_accounts_provider_idx').on(table.provider)
])

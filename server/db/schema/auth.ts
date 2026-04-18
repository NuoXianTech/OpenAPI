import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  boolean,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { users } from './user'

// ------------------------------------------------------------------
// Sessions
// ------------------------------------------------------------------
export const sessions = pgTable('sessions', {
  sessionId: varchar('session_id', { length: 128 }).primaryKey(), // sessionId 的哈希值
  kind: varchar('kind', { length: 20 }).notNull().default('user'), // user / admin
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  ip: varchar('ip', { length: 45 }),
  userAgent: varchar('user_agent', { length: 500 }),
  lastActiveAt: timestamp('last_active_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  index('sessions_user_idx').on(table.userId),
  index('sessions_expires_idx').on(table.expiresAt),
  index('sessions_last_active_idx').on(table.lastActiveAt),
])

// ------------------------------------------------------------------
// Verification tokens（邮箱验证 / 密码重置 / 邮箱变更等一次性 token）
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
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  index('verification_tokens_user_created_idx').on(table.userId, table.createdAt),
  index('verification_tokens_email_idx').on(table.email),
  index('verification_tokens_purpose_idx').on(table.purpose),
  index('verification_tokens_expires_idx').on(table.expiresAt),
])

// ------------------------------------------------------------------
// OAuth provider config (QQ / WeChat / GitHub / Google ...)
// 敏感字段（clientSecret）必须在应用层 AES-GCM 加密后再落库
// ------------------------------------------------------------------
export const oauthProviders = pgTable('oauth_providers', {
  id: serial('id').primaryKey(),
  provider: varchar('provider', { length: 32 }).notNull(),
  displayName: varchar('display_name', { length: 80 }).notNull(),
  icon: varchar('icon', { length: 120 }),
  clientId: varchar('client_id', { length: 255 }).notNull(),
  clientSecret: varchar('client_secret', { length: 1000 }).notNull(),
  scopes: jsonb('scopes').$type<string[]>().default([]).notNull(),
  callbackUrl: varchar('callback_url', { length: 1000 }).notNull(),
  authorizeUrl: varchar('authorize_url', { length: 1000 }),
  tokenUrl: varchar('token_url', { length: 1000 }),
  userInfoUrl: varchar('user_info_url', { length: 1000 }),
  extraConfig: jsonb('extra_config').$type<Record<string, unknown>>(),
  isEnabled: boolean('is_enabled').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, table => [
  uniqueIndex('oauth_providers_provider_uq').on(table.provider),
  index('oauth_providers_enabled_sort_idx').on(table.isEnabled, table.sortOrder),
])

// ------------------------------------------------------------------
// User third-party account binding
// 一个用户可绑定多个第三方账号；token 须加密后存储
// ------------------------------------------------------------------
export const oauthAccounts = pgTable('oauth_accounts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 32 }).notNull(),
  providerUserId: varchar('provider_user_id', { length: 255 }).notNull(), // openId / uid
  unionId: varchar('union_id', { length: 255 }), // 微信 unionId 等跨应用身份
  accessToken: varchar('access_token', { length: 2000 }),
  refreshToken: varchar('refresh_token', { length: 2000 }),
  tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
  scope: varchar('scope', { length: 500 }),
  nickname: varchar('nickname', { length: 140 }),
  avatarUrl: varchar('avatar_url', { length: 1000 }),
  email: varchar('email', { length: 255 }),
  profileRaw: jsonb('profile_raw').$type<Record<string, unknown>>(),
  linkedAt: timestamp('linked_at', { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  lastLoginIp: varchar('last_login_ip', { length: 45 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, table => [
  uniqueIndex('oauth_accounts_provider_pid_uq').on(table.provider, table.providerUserId),
  index('oauth_accounts_user_idx').on(table.userId),
  index('oauth_accounts_provider_idx').on(table.provider),
  index('oauth_accounts_union_idx').on(table.provider, table.unionId),
])

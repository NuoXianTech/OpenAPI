import {
  pgTable,
  serial,
  integer,
  varchar,
  timestamp,
  index,
  uniqueIndex
} from 'drizzle-orm/pg-core'
import { users } from './user'

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
// User third-party account binding（用户三方绑定）
//
// OAuth 各 provider 的应用配置（clientId / clientSecret / 启用开关）已并入
// siteSettings 的扁平列（明文），由 oauthProviderService 适配读写，不再单列一张
// oauth_providers 表。
//
// 一个用户每个 provider 至多一个绑定（见下方 (userId, provider) 唯一约束）。
// 本应用 OAuth 仅用于登录身份识别，不调用上游 API，因此不持久化
// access_token / refresh_token / scope。providerUserId 已是稳定身份标识。
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
  // 一个用户每个 provider 至多一个绑定（对应 oauthAccountService.unbind(userId, provider) 语义；
  // 借鉴 Cloudreve open_ids 的 openid_user_id_provider）。该唯一索引的 userId 前缀亦覆盖按 userId 的查询，
  // 故无需再单列 userId 索引。
  uniqueIndex('oauth_accounts_user_provider_uq').on(table.userId, table.provider),
  index('oauth_accounts_provider_idx').on(table.provider)
])

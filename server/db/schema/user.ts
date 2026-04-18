import {
  pgTable,
  serial,
  varchar,
  boolean,
  timestamp,
  text,
  bigint,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 50 }).unique().notNull(),
  displayName: varchar('display_name', { length: 100 }),
  // email 以原大小写存储，通过 lower(email) 唯一索引做不区分大小写去重
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  avatarUrl: varchar('avatar_url', { length: 255 }),
  bio: text('bio'),
  credits: bigint('credits', { mode: 'number' }).notNull().default(0), // API 配额余额
  isActive: boolean('is_active').default(false).notNull(),
  isBanned: boolean('is_banned').default(false).notNull(),
  bannedReason: varchar('banned_reason', { length: 500 }),
  bannedUntil: timestamp('banned_until', { withTimezone: true }),
  loginAttemptsCount: bigint('login_attempts_count', { mode: 'number' }).notNull().default(0),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  lastLoginIp: varchar('last_login_ip', { length: 45 }),
  lastLoginUserAgent: varchar('last_login_user_agent', { length: 500 }),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()),
}, table => [
  uniqueIndex('users_email_lower_uq').on(sql`lower(${table.email})`),
  index('users_active_banned_idx').on(table.isActive, table.isBanned),
  index('users_deleted_at_idx').on(table.deletedAt),
])

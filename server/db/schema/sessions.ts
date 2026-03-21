import {
  pgTable,
  integer,
  varchar,
  timestamp,
} from 'drizzle-orm/pg-core'
import { users } from './users'

export const sessions = pgTable('sessions', {
  sessionId: varchar('session_id', { length: 128 }).primaryKey(), // 实际存储 sessionId 的哈希值
  kind: varchar('kind', { length: 20 }).notNull().default('user'), // user/admin
  userId: integer('user_id').references(() => users.id),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

import {
  pgTable,
  integer,
  varchar,
  timestamp,
} from 'drizzle-orm/pg-core'
import { users } from './users'

export const sessions = pgTable('sessions', {
  sessionId: varchar('session_id', { length: 128 }).primaryKey(),
  kind: varchar('kind', { length: 20 }).notNull().default('user'), // user/admin
  userId: integer('user_id').references(() => users.id),
  username: varchar('username', { length: 50 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

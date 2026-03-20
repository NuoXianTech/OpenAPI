import {
  pgTable,
  serial,
  integer,
  varchar,
  timestamp,
} from 'drizzle-orm/pg-core'
import { users } from './users'

export const sessions = pgTable('sessions', {
  id: serial('id').primaryKey(),
  sessionId: varchar('session_id', { length: 128 }).notNull().unique(),
  userId: integer('user_id').references(() => users.id),
  role: varchar('role', { length: 20 }).notNull(),
  username: varchar('username', { length: 50 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
})

import {
  pgTable,
  serial,
  integer,
  varchar,
  timestamp,
} from 'drizzle-orm/pg-core'
import { users } from './users'

export const emailVerificationTokens = pgTable('email_verification_tokens', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id).unique(),
  tokenHash: varchar('token_hash', { length: 128 }).notNull(),
  purpose: varchar('purpose', { length: 30 }).notNull().default('email_verify'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
})

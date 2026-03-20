import {
  pgTable,
  serial,
  integer,
  varchar,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core'
import { users } from './users'

export const apiKeys = pgTable('api_keys', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  name: varchar('name', { length: 100 }).notNull(),
  apiKey: varchar('api_key', { length: 120 }).notNull().unique(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
})

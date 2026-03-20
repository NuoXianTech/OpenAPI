import {
  pgTable,
  serial,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
} from 'drizzle-orm/pg-core'
import { users } from './users'

export const friendLinks = pgTable('friend_links', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 140 }).notNull(),
  url: varchar('url', { length: 1000 }).notNull(),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
})

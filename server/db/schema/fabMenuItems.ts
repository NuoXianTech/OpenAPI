import {
  pgTable,
  serial,
  varchar,
  boolean,
  integer,
  timestamp,
} from 'drizzle-orm/pg-core'
import { users } from './users'

export const fabMenuItems = pgTable('fab_menu_items', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 140 }).notNull(),
  subtitle: varchar('subtitle', { length: 240 }),
  icon: varchar('icon', { length: 120 }).notNull().default('mdi:link-variant'),
  actionType: varchar('action_type', { length: 20 }).notNull().default('link'),
  actionValue: varchar('action_value', { length: 1000 }).notNull(),
  actionLabel: varchar('action_label', { length: 60 }).notNull().default('打开'),
  target: varchar('target', { length: 20 }).notNull().default('_blank'),
  sort: integer('sort').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdBy: integer('created_by').references(() => users.id),
  updatedBy: integer('updated_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
})
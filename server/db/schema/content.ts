import {
  pgTable,
  serial,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  index,
} from 'drizzle-orm/pg-core'
import { users } from './user'

// ------------------------------------------------------------------
// Friend Links（友情链接）
// ------------------------------------------------------------------
export const friendLinks = pgTable('friend_links', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 140 }).notNull(),
  url: varchar('url', { length: 1000 }).notNull(),
  description: text('description'),
  logoUrl: varchar('logo_url', { length: 1000 }),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, table => [
  index('friend_links_active_sort_idx').on(table.isActive, table.sortOrder),
])

// ------------------------------------------------------------------
// FAB Menu Items（前台悬浮按钮菜单）
// ------------------------------------------------------------------
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
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
  updatedBy: integer('updated_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, table => [
  index('fab_menu_items_active_sort_idx').on(table.isActive, table.sort),
])

// ------------------------------------------------------------------
// Announcements（站点公告）
// ------------------------------------------------------------------
export const announcements = pgTable('announcements', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 200 }).notNull(),
  content: text('content').notNull(),
  level: varchar('level', { length: 20 }).notNull().default('info'), // info / success / warning / critical
  isPinned: boolean('is_pinned').notNull().default(false),
  isEnabled: boolean('is_enabled').notNull().default(true),
  startAt: timestamp('start_at', { withTimezone: true }),
  endAt: timestamp('end_at', { withTimezone: true }),
  linkUrl: varchar('link_url', { length: 1000 }),
  sortOrder: integer('sort_order').notNull().default(0),
  createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
  updatedBy: integer('updated_by').references(() => users.id, { onDelete: 'set null' }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, table => [
  index('announcements_enabled_pin_sort_idx').on(table.isEnabled, table.isPinned, table.sortOrder),
  index('announcements_window_idx').on(table.startAt, table.endAt),
])

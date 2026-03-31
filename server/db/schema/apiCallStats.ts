import {
  pgTable,
  serial,
  integer,
  index,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core'
import { apiLists } from './apiLists'
import { apiCalls } from './apiCalls'

export const apiCallStats = pgTable('api_call_stats', {
  id: serial('id').primaryKey(),
  apiListId: integer('api_id').notNull().references(() => apiLists.id),
  apiCallId: integer('api_call_id').references(() => apiCalls.id),
  statDate: timestamp('stat_date', { withTimezone: true }).notNull(),
  totalCount: integer('total_count').notNull().default(0),
  successCount: integer('success_count').notNull().default(0),
  failureCount: integer('failure_count').notNull().default(0),
  apiPath: varchar('api_path', { length: 200 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, table => [
  uniqueIndex('api_call_stats_api_id_stat_date_uq').on(table.apiListId, table.statDate),
  index('api_call_stats_stat_date_idx').on(table.statDate),
])

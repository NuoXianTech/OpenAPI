import {
  pgTable,
  serial,
  integer,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core'
import { apiLists } from './apiLists'
import { apiCalls } from './apiCalls'

export const apiCallStats = pgTable('api_call_stats', {
  id: serial('id').primaryKey(),
  apiId: integer('api_id').notNull().references(() => apiLists.id),
  apiCallId: integer('api_call_id').references(() => apiCalls.id),
  statDate: timestamp('stat_date', { withTimezone: true }).notNull(),
  totalCount: integer('total_count').notNull().default(0),
  successCount: integer('success_count').notNull().default(0),
  failureCount: integer('failure_count').notNull().default(0),
  apiPath: varchar('api_path', { length: 200 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
})

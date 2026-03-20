import {
  pgTable,
  serial,
  integer,
  varchar,
  boolean,
  timestamp,
  integer as pgInteger,
  text,
} from 'drizzle-orm/pg-core'
import { apiLists } from './apiLists'
import { apiKeys } from './apiKeys'
import { users } from './users'

export const apiCalls = pgTable('api_calls', {
  id: serial('id').primaryKey(),
  apiId: integer('api_id').references(() => apiLists.id).notNull(),
  apiKeyId: integer('api_key_id').references(() => apiKeys.id),
  userId: integer('user_id').references(() => users.id),
  path: varchar('path', { length: 1000 }).notNull(),
  method: varchar('method', { length: 10 }).notNull(),
  statusCode: pgInteger('status_code').notNull(),
  latencyMs: pgInteger('latency_ms').notNull().default(0),
  ip: varchar('ip', { length: 45 }),
  requestSize: pgInteger('request_size'),
  responseSize: pgInteger('response_size'),
  rawRequest: text('raw_request'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

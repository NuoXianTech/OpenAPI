import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import { users } from './users'

export const operationLogs = pgTable('operation_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  actor: varchar('actor', { length: 100 }), // 操作者用户名或标识
  action: varchar('action', { length: 100 }).notNull(), // 操作类型，例如 create/update/delete/login
  resourceType: varchar('resource_type', { length: 100 }), // 目标资源类型，例如 'user','api','apikey'
  resourceId: varchar('resource_id', { length: 128 }), // 目标资源ID
  ip: varchar('ip', { length: 45 }),
  userAgent: varchar('user_agent', { length: 512 }),
  detail: text('detail'), // 详细描述或 JSON 字符串
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

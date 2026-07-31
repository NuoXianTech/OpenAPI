import {
  pgTable,
  serial,
  varchar,
  integer,
  boolean,
  jsonb,
  timestamp,
  index
} from 'drizzle-orm/pg-core'
import { users } from './user'

// ------------------------------------------------------------------
// System Settings（全站强类型键值配置）
//
// settingKey 使用带命名空间的稳定标识；value 使用 JSONB 保存原生标量。
// 字段默认值、校验、公开范围与敏感级别统一声明在
// server/config/system-settings.ts。敏感值写入前使用应用密钥加密。
// ------------------------------------------------------------------
export const systemSettings = pgTable('system_settings', {
  settingKey: varchar('setting_key', { length: 150 }).primaryKey(),
  value: jsonb('value').$type<unknown>().notNull(),
  isSecret: boolean('is_secret').notNull().default(false),
  description: varchar('description', { length: 500 }).notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date())
}, table => [
  index('system_settings_secret_idx').on(table.isSecret)
])

// ------------------------------------------------------------------
// Operation Logs（后台审计日志 · 审计不可变）
//
// userId 是 users.id 整数快照，无外键约束：
//   - null = 系统任务或无操作者快照
//   - 整数 = 实际操作的用户 id 快照（用户硬删后仍保留历史指向）
// actor 是用户名/管理员名快照，用于在用户被硬删后继续可追溯人物姓名。
// ------------------------------------------------------------------
export const operationLogs = pgTable('operation_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'),
  actor: varchar('actor', { length: 140 }),
  action: varchar('action', { length: 80 }).notNull(),
  resourceType: varchar('resource_type', { length: 80 }),
  resourceId: varchar('resource_id', { length: 120 }),
  ip: varchar('ip', { length: 45 }),
  userAgent: varchar('user_agent', { length: 500 }),
  detail: jsonb('detail').$type<Record<string, unknown>>(),
  status: varchar('status', { length: 20 }).notNull().default('success'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, table => [
  index('operation_logs_created_at_idx').on(table.createdAt.desc()),
  index('operation_logs_user_created_idx').on(table.userId, table.createdAt.desc()),
  index('operation_logs_action_idx').on(table.action),
  index('operation_logs_resource_idx').on(table.resourceType, table.resourceId)
])

// ------------------------------------------------------------------
// Login Logs（登录日志 · 跟随用户删除）
// ------------------------------------------------------------------
export const loginLogs = pgTable('login_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  username: varchar('username', { length: 50 }).notNull(),
  method: varchar('method', { length: 32 }).notNull(),
  success: boolean('success').notNull(),
  failureReason: varchar('failure_reason', { length: 100 }),
  ip: varchar('ip', { length: 45 }),
  userAgent: varchar('user_agent', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, table => [
  index('login_logs_user_created_idx').on(table.userId, table.createdAt.desc()),
  index('login_logs_username_idx').on(table.username),
  index('login_logs_created_at_idx').on(table.createdAt.desc()),
  index('login_logs_method_idx').on(table.method)
])

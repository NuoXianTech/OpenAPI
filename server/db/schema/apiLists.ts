import {
  pgTable,
  serial,
  varchar,
  integer,
  text,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core'
import { users } from './users'

export const apiLists = pgTable('api_lists', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).unique().notNull(), // 接口编码
  name: varchar('name', { length: 100 }).notNull(), // 接口名称
  status: integer('status').default(1).notNull(), // 接口状态，-1=未知 0=异常 1=正常 2=维护 3=废弃
  category: varchar('category', { length: 100 }), // 接口分类
  shortDesc: varchar('short_desc', { length: 30 }).notNull(), // 简短描述
  description: text('description').notNull(), // 完整描述
  version: varchar('version', { length: 50 }).notNull().default('v1'), // 接口版本
  tags: varchar('tags', { length: 255 }), // 标签，逗号分隔
  authType: varchar('auth_type', { length: 50 }).notNull().default('none'), // 鉴权类型
  requestSchema: text('request_schema'), // 请求结构说明
  responseSchema: text('response_schema'), // 响应结构说明
  requestExample: text('request_example'), // 请求示例
  responseExample: text('response_example'), // 响应示例
  httpMethod: varchar('http_method', { length: 10 }).notNull(), // 请求方法
  apiPath: varchar('api_path', { length: 200 }).notNull(), // 接口路径
  docUrl: varchar('doc_url', { length: 200 }).notNull(), // 接口文档
  isEnabled: boolean('is_enabled').default(true).notNull(), // 是否启用接口
  isApiKey: boolean('is_api_key').default(false).notNull(), // 是否启用APIKey
  isStatistics: boolean('is_statistics').default(true).notNull(), // 是否启用接口统计
  rateLimitPerMinute: integer('rate_limit_per_minute').default(0).notNull(), // 每分钟限流
  totalCalls: integer('total_calls').default(0).notNull(), // 总调用次数
  successCalls: integer('success_calls').default(0).notNull(), // 成功调用次数
  failureCalls: integer('failure_calls').default(0).notNull(), // 失败调用次数
  lastCalledAt: timestamp('last_called_at', { withTimezone: true }), // 最近调用时间
  createdBy: integer('created_by').references(() => users.id), // 创建用户
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(), // 创建时间
  updatedBy: integer('updated_by').references(() => users.id), // 更新用户
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()), // 更新时间
})

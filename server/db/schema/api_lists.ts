import {
  pgTable,
  serial,
  varchar,
  integer,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const api_lists = pgTable("api_lists", {
  // 统一使用 snake_case 命名数据库表，已经在nuxt.config.ts中配置了自动转换
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).unique().notNull(), // 接口编码
  name: varchar("name", { length: 100 }).notNull(), // 接口名称
  status: integer("status").default(1).notNull(), // 接口状态，-1=未知 0=异常 1=正常 2=维护 3=废弃
  shortDesc: varchar("short_desc", { length: 30 }).notNull(), // 简短描述
  description: text("description").notNull(), // 完整描述
  httpMethod: varchar("http_method", { length: 10 }).notNull(), // 请求方法
  apiPath: varchar("api_path", { length: 200 }).notNull(), // 接口路径
  docUrl: varchar("doc_url", { length: 200 }).notNull(), // 接口文档
  isEnabled: boolean("is_enabled").default(true).notNull(), // 是否启用接口
  isApiKey: boolean("is_api_key").default(false).notNull(), // 是否启用APIKey
  isStatistics: boolean("is_statistics").default(true).notNull(), // 是否启用接口统计
  createdBy: integer("created_by").references(() => users.id), // 创建用户
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(), // 创建时间
  updatedBy: integer("updated_by").references(() => users.id), // 更新用户
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()), // 更新时间
});

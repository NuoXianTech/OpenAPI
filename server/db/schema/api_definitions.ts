import { pgTable, serial, varchar, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const apiDefinitions = pgTable("api_definitions", {
  // 统一使用 snake_case 命名数据库列
  id: serial().primaryKey(),
  code: varchar({ length: 50 }).unique().notNull(),   // 接口编码
  name: varchar({ length: 100 }).notNull(),           // 接口名称
  status: integer().default(1).notNull(),             // 接口状态，-1=未知 0=异常 1=正常 2=维护 3=废弃
  short_desc: varchar({ length: 30 }).notNull(),      // 简短描述
  description: text().notNull(),                      // 完整描述
  http_method: varchar({ length: 10 }).notNull(),     // 请求方法
  api_path: varchar({ length: 200 }).notNull(),       // 接口路径
  doc_url: varchar({ length: 200 }).notNull(),        // 接口文档
  is_enabled: boolean().default(true).notNull(),      // 是否启用接口
  is_api_key: boolean().default(false).notNull(),     // 是否启用APIKey
  is_statistics: boolean().default(true).notNull(),   // 是否启用接口统计
  created_at: timestamp().notNull().defaultNow(),     // 创建时间
  updated_at: timestamp().notNull().defaultNow(),     // 更新时间
});

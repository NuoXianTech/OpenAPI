import { pgTable, serial, varchar, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  // 统一使用 snake_case 命名数据库列
  id: serial().primaryKey(),
  username: varchar().default("50").unique().notNull(), // 用户名
  email: varchar().unique().notNull(),                  // 邮箱
  password_hash: varchar().notNull(),                   // 密码哈希
  display_name: varchar().default("100").notNull(),     // 显示名称
  avatar_url: varchar().default("200").notNull(),       // 头像URL
  bio: text().notNull(),                                // 个人简介
  role: varchar().default("20").notNull(),              // 角色，例如 'admin', 'user'
  is_active: boolean().default(true).notNull(),         // 账户是否激活
  is_banned: boolean().default(false).notNull(),        // 账户是否被封禁
  last_login_at: timestamp().notNull().defaultNow(),    // 最后登录时间
  last_login_ip: varchar().default("45").notNull(),     // 最后登录IP
  api_key: varchar().default("100").unique().notNull(), // API Key
});

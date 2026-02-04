import { pgTable, serial, varchar, boolean, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  // 统一使用 snake_case 命名数据库列
  id: serial().primaryKey(),
  username: varchar({ length: 50 }).unique().notNull(),                                   // 用户名
  email: varchar({ length: 255 }).unique().notNull(),                                     // 邮箱
  password_hash: varchar({ length: 255 }).notNull(),                                      // 密码哈希
  display_name: varchar({ length: 100 }),                                                 // 显示名称
  avatar_url: varchar({ length: 255 }),                                                   // 头像URL
  role: varchar({ length: 20 }).notNull(),                                                // 角色，例如 'admin', 'user'
  is_active: boolean().default(false).notNull(),                                          // 账户是否激活
  is_banned: boolean().default(false).notNull(),                                          // 账户是否被封禁
  last_login_at: timestamp({ withTimezone: true }).notNull().defaultNow(),                // 最后登录时间
  last_login_ip: varchar({ length: 45 }).notNull(),                                       // 最后登录IP
  api_key: varchar({ length: 100 }).unique(),                                             // API Key
  created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),                   // 注册时间
  updated_at: timestamp({ withTimezone: true }).defaultNow().$onUpdate(() => new Date()), // 更新时间
});

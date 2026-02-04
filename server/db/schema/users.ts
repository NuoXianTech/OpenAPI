import { pgTable, serial, varchar, boolean, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  // 统一使用 snake_case 命名数据库表，已经在nuxt.config.ts中配置了自动转换
  id: serial().primaryKey(),
  username: varchar({ length: 50 }).unique().notNull(),                                  // 用户名
  email: varchar({ length: 255 }).unique().notNull(),                                    // 邮箱
  passwordHash: varchar({ length: 255 }).notNull(),                                      // 密码哈希
  displayName: varchar({ length: 100 }),                                                 // 显示名称
  avatarUrl: varchar({ length: 255 }),                                                   // 头像URL
  role: varchar({ length: 20 }).notNull(),                                               // 角色，例如 'admin', 'user'
  isActive: boolean().default(false).notNull(),                                          // 账户是否激活
  isBanned: boolean().default(false).notNull(),                                          // 账户是否被封禁
  lastLoginAt: timestamp({ withTimezone: true }).notNull().defaultNow(),                 // 最后登录时间
  lastLoginIp: varchar({ length: 45 }).notNull(),                                        // 最后登录IP
  apiKey: varchar({ length: 100 }).unique(),                                             // API Key
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),                   // 注册时间
  updatedAt: timestamp({ withTimezone: true }).defaultNow().$onUpdate(() => new Date()), // 更新时间
});

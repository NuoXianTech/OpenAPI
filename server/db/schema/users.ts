import {
  pgTable,
  serial,
  varchar,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  // 统一使用 snake_case 命名数据库表，已经在nuxt.config.ts中配置了自动转换
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).unique().notNull(), // 用户名
  email: varchar("email", { length: 255 }).unique().notNull(), // 邮箱
  passwordHash: varchar("password_hash", { length: 255 }).notNull(), // 密码哈希
  displayName: varchar("display_name", { length: 100 }), // 显示名称
  avatarUrl: varchar("avatar_url", { length: 255 }), // 头像URL
  role: varchar("role", { length: 20 }).notNull(), // 角色，例如 'admin', 'user'
  isActive: boolean("is_active").default(false).notNull(), // 账户是否激活
  isBanned: boolean("is_banned").default(false).notNull(), // 账户是否被封禁
  lastLoginAt: timestamp("last_login_at", { withTimezone: true })
    .notNull()
    .defaultNow(), // 最后登录时间
  lastLoginIp: varchar("last_login_ip", { length: 45 }).notNull(), // 最后登录IP
  apiKey: varchar("api_key", { length: 100 }).unique(), // API Key
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(), // 注册时间
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()), // 更新时间
});

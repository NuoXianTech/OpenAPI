import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core'

export const siteSettings = pgTable('site_settings', {
  id: serial('id').primaryKey(),
  scope: varchar('scope', { length: 32 }).notNull().default('default').unique(),

  siteUrl: varchar('site_url', { length: 1000 }).notNull().default('http://localhost:3000'),
  siteImg: varchar('site_img', { length: 1000 }).notNull().default('https://q1.qlogo.cn/g?b=qq&nk=1428309052&s=640'),
  siteName: varchar('site_name', { length: 140 }).notNull().default('OpenAPI'),
  siteDescription: text('site_description').notNull().default('OpenAPI是免费为用户提供网络数据接口调用的服务平台。'),
  startTime: varchar('start_time', { length: 32 }).notNull().default('2026-01-01 00:00:00'),

  sessionMaxAgeSeconds: integer('session_max_age_seconds').notNull().default(60 * 60 * 24 * 7),
  emailVerifyExpiresInMinutes: integer('email_verify_expires_in_minutes').notNull().default(30),

  smtpHost: varchar('smtp_host', { length: 255 }).notNull().default('smtp.example.com'),
  smtpPort: integer('smtp_port').notNull().default(465),
  smtpSecure: boolean('smtp_secure').notNull().default(true),
  smtpUser: varchar('smtp_user', { length: 255 }).notNull().default(''),
  smtpPass: varchar('smtp_pass', { length: 255 }).notNull().default(''),
  smtpFrom: varchar('smtp_from', { length: 255 }).notNull().default('no-reply@example.com'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
})

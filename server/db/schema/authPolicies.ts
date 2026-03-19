import {
  pgTable,
  serial,
  integer,
  boolean,
  varchar,
  timestamp,
} from 'drizzle-orm/pg-core'

export const authPolicies = pgTable('auth_policies', {
  id: serial('id').primaryKey(),
  minPasswordLength: integer('min_password_length').notNull().default(8),
  maxPasswordLength: integer('max_password_length').notNull().default(64),
  minUsernameLength: integer('min_username_length').notNull().default(3),
  maxUsernameLength: integer('max_username_length').notNull().default(20),
  requireUppercase: boolean('require_uppercase').notNull().default(true),
  requireLowercase: boolean('require_lowercase').notNull().default(true),
  requireDigit: boolean('require_digit').notNull().default(true),
  requireSpecial: boolean('require_special').notNull().default(false),
  specialChars: varchar('special_chars', { length: 128 })
    .notNull()
    .default('!@#$%^&*()-_=+[]{}|;:,.<>/?'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

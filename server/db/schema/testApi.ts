import { integer, pgTable, serial, text } from "drizzle-orm/pg-core";

export const testApi = pgTable("test_api", {
  id: serial().primaryKey(),
  name: text().notNull(),
  description: text().notNull(),
  docurl: text().notNull(),
  url: text().notNull(),
  method: text().notNull(),
  count: integer().notNull().default(0),
  status: integer().notNull().default(1), // 0-禁用，1-启用
});

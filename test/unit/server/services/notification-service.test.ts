import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import * as schema from '~~/server/db/schema'

const testContext = vi.hoisted(() => ({
  database: null as unknown
}))

vi.mock('~~/server/db/client', () => ({
  get db() {
    return testContext.database
  }
}))

const { notificationService } = await import('~~/server/services/notification-service')

let client: PGlite

beforeAll(async () => {
  client = new PGlite()
  await client.exec(`
    CREATE TABLE notification_messages (
      id serial PRIMARY KEY,
      title varchar(200) NOT NULL,
      content text NOT NULL,
      level varchar(20) NOT NULL DEFAULT 'info',
      link_url varchar(1000),
      audience varchar(20) NOT NULL DEFAULT 'specific',
      recipient_count integer NOT NULL DEFAULT 0,
      sender_user_id integer,
      sender_actor varchar(140),
      deleted_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE notification_deliveries (
      id serial PRIMARY KEY,
      message_id integer NOT NULL,
      recipient_user_id integer NOT NULL,
      is_read boolean NOT NULL DEFAULT false,
      read_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    INSERT INTO notification_messages
      (title, content, audience, recipient_count, created_at)
    VALUES
      ('First notification', 'First content', 'all_current', 1, '2026-01-01T00:00:00Z'),
      ('Second notification', 'Second content', 'all_current', 1, '2026-01-02T00:00:00Z');

    INSERT INTO notification_deliveries
      (message_id, recipient_user_id, is_read, read_at)
    VALUES
      (1, 1, true, '2026-01-01T01:00:00Z'),
      (2, 1, false, null);
  `)
  testContext.database = drizzle(client, { schema })
})

afterAll(async () => {
  await client.close()
})

describe('notification service', () => {
  it('counts deliveries and reads per message instead of across all messages', async () => {
    const rows = await notificationService.listMessagesForAdmin()

    expect(rows.map(row => ({
      title: row.title,
      deliveredCount: row.deliveredCount,
      readCount: row.readCount
    }))).toEqual([
      { title: 'Second notification', deliveredCount: 1, readCount: 0 },
      { title: 'First notification', deliveredCount: 1, readCount: 1 }
    ])
  })
})

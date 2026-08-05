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
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (message_id, recipient_user_id),
      CHECK (recipient_user_id <> 99)
    );

    CREATE TABLE users (
      id serial PRIMARY KEY,
      username varchar(50) NOT NULL,
      is_active boolean NOT NULL DEFAULT true,
      is_banned boolean NOT NULL DEFAULT false
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

    INSERT INTO users (id, username, is_active, is_banned)
    VALUES (1, 'first-user', true, false), (99, 'invalid-delivery', true, false);
  `)
  testContext.database = drizzle(client, { schema })
})

afterAll(async () => {
  await client.close()
})

describe('notification service', () => {
  it('counts deliveries and reads per message instead of across all messages', async () => {
    const result = await notificationService.listMessagesForAdmin()

    expect(result.items.map(row => ({
      title: row.title,
      deliveredCount: row.deliveredCount,
      readCount: row.readCount
    }))).toEqual([
      { title: 'Second notification', deliveredCount: 1, readCount: 0 },
      { title: 'First notification', deliveredCount: 1, readCount: 1 }
    ])
    expect(result.total).toBe(2)
  })

  it('filters and paginates notification history with an accurate total', async () => {
    const result = await notificationService.listMessagesForAdmin({
      keyword: 'notification',
      audience: 'all_current',
      limit: 1,
      offset: 1
    })

    expect(result.total).toBe(2)
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.title).toBe('First notification')
  })

  it('paginates delivery details with an accurate total', async () => {
    const result = await notificationService.getMessageDetail(1, { limit: 1, offset: 0 })

    expect(result.total).toBe(1)
    expect(result.deliveries).toHaveLength(1)
    expect(result.deliveries[0]?.recipientUsername).toBe('first-user')
  })

  it('rolls back the message when delivery creation fails', async () => {
    await expect(notificationService.send({
      title: 'Rollback notification',
      content: 'Must not remain without a delivery',
      audience: 'specific',
      recipientUserIds: [99]
    })).rejects.toThrow()

    const result = await notificationService.listMessagesForAdmin()
    expect(result.total).toBe(2)
  })
})

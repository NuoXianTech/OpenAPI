import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import * as schema from '~~/server/db/schema'

const testContext = vi.hoisted(() => ({ database: null as unknown }))

vi.mock('~~/server/db/client', () => ({
  get db() {
    return testContext.database
  }
}))

const { creditService } = await import('~~/server/services/credit-service')
let client: PGlite

beforeAll(async () => {
  client = new PGlite()
  await client.exec(`
    CREATE TABLE users (
      id serial PRIMARY KEY,
      credits integer NOT NULL DEFAULT 0,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE credit_transactions (
      id bigserial PRIMARY KEY,
      user_id integer,
      amount integer NOT NULL,
      balance_after integer NOT NULL,
      reason varchar(50) NOT NULL,
      api_id integer,
      api_call_id bigint,
      code_id integer,
      operator_id integer,
      operator_name varchar(140),
      ip varchar(45),
      remark varchar(500),
      meta jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX credit_transactions_api_call_reason_uq
      ON credit_transactions (api_call_id, reason)
      WHERE api_call_id IS NOT NULL;
  `)
  testContext.database = drizzle(client, { schema })
})

beforeEach(async () => {
  await client.exec(`
    TRUNCATE credit_transactions, users RESTART IDENTITY;
    INSERT INTO users (credits) VALUES (10);
  `)
})

afterAll(async () => client.close())

describe('credit service', () => {
  it('returns an existing API charge without deducting the balance twice', async () => {
    await expect(creditService.forceCharge({
      userId: 1,
      amount: 3,
      apiCallId: 42
    })).resolves.toEqual({ charged: 3, balanceAfter: 7 })

    await expect(creditService.forceCharge({
      userId: 1,
      amount: 3,
      apiCallId: 42
    })).resolves.toEqual({ charged: 3, balanceAfter: 7 })

    const balance = await client.query<{ credits: number }>('SELECT credits FROM users WHERE id = 1')
    const transactions = await client.query<{ count: number }>('SELECT count(*)::int AS count FROM credit_transactions')
    expect(balance.rows[0]?.credits).toBe(7)
    expect(transactions.rows[0]?.count).toBe(1)
  })
})

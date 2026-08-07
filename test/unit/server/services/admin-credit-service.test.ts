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

const { adminCreditService } = await import('~~/server/services/admin-credit-service')
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
  `)
  testContext.database = drizzle(client, { schema })
})

beforeEach(async () => {
  await client.exec(`
    TRUNCATE credit_transactions, users RESTART IDENTITY;
    INSERT INTO users (credits) VALUES (10), (3);
  `)
})

afterAll(async () => client.close())

describe('admin credit service', () => {
  it('deduplicates targets and records the resulting balances', async () => {
    const result = await adminCreditService.batchAdjust({
      userIds: [1, 1, 2],
      operation: 'grant',
      amount: 5,
      operatorId: 9,
      operatorName: 'admin'
    })

    expect(result).toEqual({
      affected: 2,
      results: [
        { userId: 1, balanceAfter: 15 },
        { userId: 2, balanceAfter: 8 }
      ]
    })
  })

  it('rolls back every adjustment when any target does not exist', async () => {
    await expect(adminCreditService.batchAdjust({
      userIds: [1, 999],
      operation: 'revoke',
      amount: 4
    })).rejects.toMatchObject({ statusCode: 404 })

    const result = await client.query<{ credits: number }>('SELECT credits FROM users WHERE id = 1')
    expect(result.rows[0]?.credits).toBe(10)
  })
})

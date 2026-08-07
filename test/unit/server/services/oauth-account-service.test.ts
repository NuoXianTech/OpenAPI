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

const { oauthAccountService } = await import('~~/server/services/oauth-account-service')
let client: PGlite

beforeAll(async () => {
  client = new PGlite()
  await client.exec(`
    CREATE TABLE users (id serial PRIMARY KEY);
    CREATE TABLE oauth_accounts (
      id serial PRIMARY KEY,
      user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider varchar(32) NOT NULL,
      provider_user_id varchar(255) NOT NULL,
      nickname varchar(140),
      avatar_url varchar(1000),
      email varchar(255),
      linked_at timestamptz NOT NULL DEFAULT now(),
      last_login_at timestamptz,
      last_login_ip varchar(45),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (provider, provider_user_id),
      UNIQUE (user_id, provider)
    );
  `)
  testContext.database = drizzle(client, { schema })
})

beforeEach(async () => {
  await client.exec(`
    TRUNCATE oauth_accounts, users RESTART IDENTITY CASCADE;
    INSERT INTO users DEFAULT VALUES;
    INSERT INTO users DEFAULT VALUES;
  `)
})

afterAll(async () => client.close())

describe('oauth account service', () => {
  it('updates profile data without changing the binding owner', async () => {
    const created = await oauthAccountService.upsertAccount({
      userId: 1,
      provider: 'github',
      providerUserId: 'github-1',
      nickname: 'old'
    })
    const updated = await oauthAccountService.upsertAccount({
      userId: 1,
      provider: 'github',
      providerUserId: 'github-1',
      nickname: 'new'
    })

    expect(updated).toMatchObject({ id: created?.id, userId: 1, nickname: 'new' })
  })

  it('never transfers an existing provider identity to another user', async () => {
    await oauthAccountService.upsertAccount({
      userId: 1,
      provider: 'github',
      providerUserId: 'github-1'
    })

    await expect(oauthAccountService.upsertAccount({
      userId: 2,
      provider: 'github',
      providerUserId: 'github-1'
    })).rejects.toMatchObject({ statusCode: 409 })
    await expect(oauthAccountService.findByProviderUserId('github', 'github-1'))
      .resolves.toMatchObject({ userId: 1 })
  })

  it('rejects a second identity for the same user and provider', async () => {
    await oauthAccountService.upsertAccount({
      userId: 1,
      provider: 'github',
      providerUserId: 'github-1'
    })

    await expect(oauthAccountService.upsertAccount({
      userId: 1,
      provider: 'github',
      providerUserId: 'github-2'
    })).rejects.toMatchObject({ statusCode: 409 })
  })
})

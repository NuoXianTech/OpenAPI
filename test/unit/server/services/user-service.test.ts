import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import * as schema from '~~/server/db/schema'

const testContext = vi.hoisted(() => ({
  database: null as unknown
}))

vi.mock('~~/server/db/client', () => ({
  get db() {
    return testContext.database
  }
}))

const { usersService } = await import('~~/server/services/user-service')

let client: PGlite

beforeAll(async () => {
  client = new PGlite()
  await client.exec(`
    CREATE TABLE users (
      id serial PRIMARY KEY,
      role varchar(20) NOT NULL DEFAULT 'user',
      username varchar(50) NOT NULL,
      display_name varchar(100),
      email varchar(255) NOT NULL,
      password_hash varchar(255) NOT NULL,
      locale varchar(16),
      credits integer NOT NULL DEFAULT 0,
      is_active boolean NOT NULL DEFAULT false,
      is_banned boolean NOT NULL DEFAULT false,
      banned_reason varchar(500),
      banned_until timestamptz,
      last_login_at timestamptz,
      last_login_ip varchar(45),
      last_login_user_agent varchar(500),
      last_checkin_at timestamptz,
      email_verified_at timestamptz,
      token_version integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `)
  testContext.database = drizzle(client, { schema })
})

beforeEach(async () => {
  await client.exec(`
    TRUNCATE users RESTART IDENTITY;
    INSERT INTO users
      (role, username, email, password_hash, is_active, is_banned, banned_until)
    VALUES
      ('admin', 'admin', 'admin@example.com', 'old-admin-hash', true, false, null),
      ('user', 'user', 'user@example.com', 'old-user-hash', true, false, null),
      ('user', 'banned', 'banned@example.com', 'old-banned-hash', true, true, '2020-01-01T00:00:00Z');
  `)
})

afterAll(async () => {
  await client.close()
})

describe('user service security state', () => {
  it('keeps at least one available administrator', async () => {
    await expect(usersService.updateUser(1, { role: 'user' })).rejects.toMatchObject({ statusCode: 400 })

    await usersService.updateUser(2, { role: 'admin' })
    const demoted = await usersService.updateUser(1, { role: 'user' })

    expect(demoted?.role).toBe('user')
  })

  it('updates the password hash and token version in one statement', async () => {
    const updated = await usersService.updatePasswordAndInvalidateSessions(2, 'new-user-hash')

    expect(updated).toMatchObject({ passwordHash: 'new-user-hash', tokenVersion: 1 })
  })

  it('only clears a ban that is still expired', async () => {
    const cleared = await usersService.clearExpiredBan(3)
    expect(cleared).toMatchObject({ isBanned: false, bannedUntil: null })

    const future = new Date(Date.now() + 60_000)
    await usersService.banUser(3, true, { bannedUntil: future })
    expect(await usersService.clearExpiredBan(3)).toBeNull()
    await expect(usersService.getById(3)).resolves.toMatchObject({ isBanned: true, bannedUntil: future })
  })
})

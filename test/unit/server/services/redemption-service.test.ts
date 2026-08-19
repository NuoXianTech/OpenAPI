import { resolve } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import * as schema from '~~/server/db/schema'

const testContext = vi.hoisted(() => ({ database: null as unknown }))

vi.mock('~~/server/db/client', () => ({
  get db() {
    return testContext.database
  }
}))
vi.stubGlobal('useRuntimeConfig', () => ({
  apiKeySecret: '0123456789abcdef0123456789abcdef'
}))

const { redemptionService } = await import(
  '~~/server/services/redemption-service'
)

let client: PGlite
let database: ReturnType<typeof drizzle<typeof schema>>

beforeAll(async () => {
  client = new PGlite()
  database = drizzle(client, { schema })
  testContext.database = database
  await migrate(database, {
    migrationsFolder: resolve(process.cwd(), 'server/db/migrations/postgresql'),
    migrationsSchema: 'drizzle',
    migrationsTable: '__drizzle_migrations'
  })
})

beforeEach(async () => {
  await client.exec('TRUNCATE TABLE users CASCADE; TRUNCATE TABLE redemption_codes CASCADE;')
})

afterAll(async () => client.close())

describe('redemption code presentation', () => {
  it('keeps lists masked and reveals plaintext through an explicit operation', async () => {
    const generated = await redemptionService.generate({ amount: 25 })
    const plaintext = generated.codes[0]!.code
    const listed = await redemptionService.list()
    const stored = (await database.select().from(schema.redemptionCodes))[0]!

    expect(plaintext).toMatch(/^[A-Z2-9-]+$/)
    expect(stored.codeCiphertext).not.toBe(plaintext)
    expect(listed.items[0]).toMatchObject({
      id: stored.id,
      codePreview: stored.codePreview
    })
    expect(listed.items[0]).not.toHaveProperty('code')
    expect(listed.items[0]).not.toHaveProperty('codeDigest')
    expect(listed.items[0]).not.toHaveProperty('codeCiphertext')

    await expect(redemptionService.reveal(stored.id)).resolves.toEqual({
      id: stored.id,
      code: plaintext
    })
    await expect(redemptionService.reveal(stored.id + 1)).resolves.toBeNull()
  })

  it('keeps only a preview in redemption history and credit metadata', async () => {
    const [user] = await database.insert(schema.users).values({
      username: 'redeemer',
      email: 'redeemer@example.com',
      passwordHash: 'not-used',
      isActive: true
    }).returning()
    const generated = await redemptionService.generate({ amount: 10 })
    const plaintext = generated.codes[0]!.code

    await redemptionService.redeem({
      userId: user!.id,
      code: plaintext,
      ip: '192.0.2.1'
    })
    const history = await redemptionService.listUserRedemptions(user!.id)
    const [transaction] = await database.select().from(schema.creditTransactions)
      .where(eq(schema.creditTransactions.userId, user!.id))

    expect(history.items[0]?.code).not.toBe(plaintext)
    expect(history.items[0]?.code).toMatch(/•/)
    expect(transaction?.meta).toEqual({
      codePreview: history.items[0]?.code,
      batchId: generated.batchId
    })
    expect(transaction?.meta).not.toHaveProperty('codeCiphertext')
  })
})

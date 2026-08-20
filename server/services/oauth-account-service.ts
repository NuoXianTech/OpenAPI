import { and, desc, eq } from 'drizzle-orm'
import { db } from '~~/server/db/client'
import { oauthAccounts } from '~~/server/db/schema'
import { createApplicationError } from '~~/server/errors/application-error'
import { firstRow } from '~~/server/utils/row'

interface OauthAccountUpsertInput {
  userId: number
  provider: string
  providerUserId: string
  nickname?: string | null
  avatarUrl?: string | null
  email?: string | null
  lastLoginIp?: string | null
}

async function findByProviderIdentity(provider: string, providerUserId: string) {
  return firstRow(await db.select().from(oauthAccounts)
    .where(and(eq(oauthAccounts.provider, provider), eq(oauthAccounts.providerUserId, providerUserId)))
    .limit(1))
}

export const oauthAccountService = {
  async findByProviderUserId(provider: string, providerUserId: string) {
    return findByProviderIdentity(provider, providerUserId)
  },

  /** 查某用户在某 provider 上的绑定（受 (userId, provider) 唯一约束，至多一条） */
  async findByUserAndProvider(userId: number, provider: string) {
    const res = await db.select().from(oauthAccounts)
      .where(and(eq(oauthAccounts.userId, userId), eq(oauthAccounts.provider, provider)))
      .limit(1)
    return firstRow(res)
  },

  /** 用户视角：列出该用户绑定的所有第三方账号，仅返回展示用字段 */
  async listSafeByUserId(userId: number) {
    const rows = await db.select({
      id: oauthAccounts.id,
      provider: oauthAccounts.provider,
      providerUserId: oauthAccounts.providerUserId,
      nickname: oauthAccounts.nickname,
      avatarUrl: oauthAccounts.avatarUrl,
      email: oauthAccounts.email,
      linkedAt: oauthAccounts.linkedAt,
      lastLoginAt: oauthAccounts.lastLoginAt
    })
      .from(oauthAccounts)
      .where(eq(oauthAccounts.userId, userId))
      .orderBy(desc(oauthAccounts.linkedAt))
    return rows
  },

  /** 解绑：要求 (userId, provider) 命中，避免误删别人的绑定 */
  async unbind(userId: number, provider: string) {
    const res = await db.delete(oauthAccounts)
      .where(and(eq(oauthAccounts.userId, userId), eq(oauthAccounts.provider, provider)))
      .returning()
    return firstRow(res)
  },

  async upsertAccount(input: OauthAccountUpsertInput) {
    const now = new Date()
    const inserted = await db.insert(oauthAccounts).values({
      userId: input.userId,
      provider: input.provider,
      providerUserId: input.providerUserId,
      nickname: input.nickname ?? null,
      avatarUrl: input.avatarUrl ?? null,
      email: input.email ?? null,
      linkedAt: now,
      lastLoginAt: now,
      lastLoginIp: input.lastLoginIp ?? null
    }).onConflictDoNothing().returning()
    if (inserted[0]) return inserted[0]

    const existing = await findByProviderIdentity(input.provider, input.providerUserId)
    if (!existing || existing.userId !== input.userId) {
      throw createApplicationError({
        statusCode: 409,
        message: existing
          ? '该第三方账号已被其他用户绑定'
          : '你已绑定该平台的另一个账号，请先解绑后再绑定'
      })
    }

    const updated = await db.update(oauthAccounts).set({
      nickname: input.nickname ?? existing.nickname,
      avatarUrl: input.avatarUrl ?? existing.avatarUrl,
      email: input.email ?? existing.email,
      lastLoginAt: now,
      lastLoginIp: input.lastLoginIp ?? existing.lastLoginIp,
      updatedAt: now
    }).where(and(
      eq(oauthAccounts.id, existing.id),
      eq(oauthAccounts.userId, input.userId)
    )).returning()
    const account = firstRow(updated)
    if (!account) throw new Error('oauth account update returned no row')
    return account
  }
}

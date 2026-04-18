import { and, desc, eq } from 'drizzle-orm'
import { oauthAccounts } from '@nuxthub/db/schema'
import { encryptSecret } from '~~/server/utils/oauthCrypto'

export interface OauthAccountUpsertInput {
  userId: number
  provider: string
  providerUserId: string
  unionId?: string | null
  accessToken?: string | null
  refreshToken?: string | null
  tokenExpiresAt?: Date | null
  scope?: string | null
  nickname?: string | null
  avatarUrl?: string | null
  email?: string | null
  profileRaw?: Record<string, unknown> | null
  lastLoginIp?: string | null
}

export const oauthAccountService = {
  async findByProviderUserId(provider: string, providerUserId: string) {
    const res = await db.select().from(oauthAccounts)
      .where(and(eq(oauthAccounts.provider, provider), eq(oauthAccounts.providerUserId, providerUserId)))
      .limit(1)
    return res[0] || null
  },

  async listByUserId(userId: number) {
    return db.select().from(oauthAccounts)
      .where(eq(oauthAccounts.userId, userId))
      .orderBy(desc(oauthAccounts.linkedAt))
  },

  async upsertAccount(input: OauthAccountUpsertInput) {
    const existing = await this.findByProviderUserId(input.provider, input.providerUserId)
    const now = new Date()

    const tokenFields = {
      accessToken: input.accessToken ? encryptSecret(input.accessToken) : null,
      refreshToken: input.refreshToken ? encryptSecret(input.refreshToken) : null,
      tokenExpiresAt: input.tokenExpiresAt ?? null,
      scope: input.scope ?? null,
    }

    if (existing) {
      const res = await db.update(oauthAccounts)
        .set({
          userId: input.userId,
          unionId: input.unionId ?? existing.unionId,
          ...tokenFields,
          nickname: input.nickname ?? existing.nickname,
          avatarUrl: input.avatarUrl ?? existing.avatarUrl,
          email: input.email ?? existing.email,
          profileRaw: input.profileRaw ?? existing.profileRaw,
          lastLoginAt: now,
          lastLoginIp: input.lastLoginIp ?? existing.lastLoginIp,
          updatedAt: now,
        })
        .where(eq(oauthAccounts.id, existing.id))
        .returning()
      return res[0]
    }

    const res = await db.insert(oauthAccounts).values({
      userId: input.userId,
      provider: input.provider,
      providerUserId: input.providerUserId,
      unionId: input.unionId ?? null,
      ...tokenFields,
      nickname: input.nickname ?? null,
      avatarUrl: input.avatarUrl ?? null,
      email: input.email ?? null,
      profileRaw: input.profileRaw ?? null,
      linkedAt: now,
      lastLoginAt: now,
      lastLoginIp: input.lastLoginIp ?? null,
    }).returning()
    return res[0]
  },
}

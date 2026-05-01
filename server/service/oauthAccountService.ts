import { and, desc, eq } from 'drizzle-orm'
import { oauthAccounts } from '@nuxthub/db/schema'

export interface OauthAccountUpsertInput {
  userId: number
  provider: string
  providerUserId: string
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
      lastLoginAt: oauthAccounts.lastLoginAt,
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
    return res[0] || null
  },

  async upsertAccount(input: OauthAccountUpsertInput) {
    const existing = await this.findByProviderUserId(input.provider, input.providerUserId)
    const now = new Date()

    if (existing) {
      const res = await db.update(oauthAccounts)
        .set({
          userId: input.userId,
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

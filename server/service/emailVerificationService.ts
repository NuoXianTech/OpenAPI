import { createHash, randomBytes } from 'node:crypto'
import { and, eq, gt, isNull } from 'drizzle-orm'
import { emailVerificationTokens } from '@nuxthub/db/schema'

const TOKEN_BYTES = 32

export const emailVerificationService = {
  generateToken() {
    return randomBytes(TOKEN_BYTES).toString('base64url')
  },

  hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex')
  },

  async createToken(userId: number, expiresInMinutes: number) {
    const token = this.generateToken()
    const tokenHash = this.hashToken(token)
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000)

    await db.delete(emailVerificationTokens)
      .where(emailVerificationTokens.userId.equals(userId))

    const res = await db.insert(emailVerificationTokens).values({
      userId,
      tokenHash,
      expiresAt,
    }).returning()

    return { token, expiresAt, record: res[0] }
  },

  async consumeToken(userId: number, token: string) {
    const tokenHash = this.hashToken(token)
    const now = new Date()

    const res = await db.select().from(emailVerificationTokens).where(
      and(
        eq(emailVerificationTokens.userId, userId),
        eq(emailVerificationTokens.tokenHash, tokenHash),
        isNull(emailVerificationTokens.consumedAt),
        gt(emailVerificationTokens.expiresAt, now),
      ),
    ).limit(1)

    const record = res[0]
    if (!record) {
      return null
    }

    const updated = await db.update(emailVerificationTokens)
      .set({ consumedAt: now })
      .where(emailVerificationTokens.id.equals(record.id))
      .returning()

    return updated[0]
  },
}

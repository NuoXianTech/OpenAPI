import { createHash, randomBytes } from 'node:crypto'
import { and, eq, gt, isNull } from 'drizzle-orm'
import { emailVerificationTokens } from '@nuxthub/db/schema'

interface VerificationPayload {
  tokenId: number
  userId: number
  email: string
  expiresAt: number
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export const emailVerificationService = {
  generateToken() {
    return randomBytes(32).toString('base64url')
  },

  async createToken(userId: number, email: string, expiresInMinutes: number) {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + expiresInMinutes * 60 * 1000)
    const token = this.generateToken()
    const tokenHash = hashToken(token)

    // 单用户同邮箱仅保留最新一条未消费 token，旧链接会被撤销。
    await db.update(emailVerificationTokens)
      .set({ revokedAt: now })
      .where(and(
        eq(emailVerificationTokens.userId, userId),
        eq(emailVerificationTokens.email, email),
        isNull(emailVerificationTokens.consumedAt),
        isNull(emailVerificationTokens.revokedAt),
        gt(emailVerificationTokens.expiresAt, now),
      ))

    const inserted = await db.insert(emailVerificationTokens)
      .values({
        userId,
        email,
        tokenHash,
        expiresAt,
      })
      .returning({
        id: emailVerificationTokens.id,
        userId: emailVerificationTokens.userId,
        email: emailVerificationTokens.email,
        expiresAt: emailVerificationTokens.expiresAt,
      })

    const record = inserted[0]
    if (!record) {
      throw new Error('failed to create verification token')
    }

    const payload: VerificationPayload = {
      tokenId: record.id,
      userId: record.userId,
      email: record.email,
      expiresAt: record.expiresAt.getTime(),
    }

    return { token, expiresAt: record.expiresAt, record: payload }
  },

  async consumeToken(userId: number, token: string) {
    if (!token) {
      return null
    }

    const now = new Date()
    const tokenHash = hashToken(token)
    const consumed = await db.update(emailVerificationTokens)
      .set({ consumedAt: now })
      .where(and(
        eq(emailVerificationTokens.userId, userId),
        eq(emailVerificationTokens.tokenHash, tokenHash),
        isNull(emailVerificationTokens.consumedAt),
        isNull(emailVerificationTokens.revokedAt),
        gt(emailVerificationTokens.expiresAt, now),
      ))
      .returning({
        id: emailVerificationTokens.id,
        userId: emailVerificationTokens.userId,
        email: emailVerificationTokens.email,
        expiresAt: emailVerificationTokens.expiresAt,
      })

    const record = consumed[0]
    if (!record) {
      return null
    }

    return {
      tokenId: record.id,
      userId: record.userId,
      email: record.email,
      expiresAt: record.expiresAt.getTime(),
    } satisfies VerificationPayload
  },
}

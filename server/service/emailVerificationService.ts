import { createHash, randomBytes } from 'node:crypto'
import { and, eq, gt, isNull } from 'drizzle-orm'
import { verificationTokens } from '@nuxthub/db/schema'

export type VerificationPurpose = 'verify' | 'reset_password' | 'change_email'

interface VerificationPayload {
  tokenId: number
  userId: number
  email: string
  purpose: VerificationPurpose
  expiresAt: number
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export const verificationTokenService = {
  generateToken() {
    return randomBytes(32).toString('base64url')
  },

  async createToken(userId: number, email: string, expiresInMinutes: number, purpose: VerificationPurpose = 'verify', ip: string | null = null) {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + expiresInMinutes * 60 * 1000)
    const token = this.generateToken()
    const tokenHash = hashToken(token)

    // 同 user+email+purpose 的旧未消费 token 统一撤销，避免多链接同时有效。
    await db.update(verificationTokens)
      .set({ revokedAt: now })
      .where(and(
        eq(verificationTokens.userId, userId),
        eq(verificationTokens.email, email),
        eq(verificationTokens.purpose, purpose),
        isNull(verificationTokens.consumedAt),
        isNull(verificationTokens.revokedAt),
        gt(verificationTokens.expiresAt, now),
      ))

    const inserted = await db.insert(verificationTokens)
      .values({
        userId,
        email,
        purpose,
        tokenHash,
        ip,
        expiresAt,
      })
      .returning({
        id: verificationTokens.id,
        userId: verificationTokens.userId,
        email: verificationTokens.email,
        purpose: verificationTokens.purpose,
        expiresAt: verificationTokens.expiresAt,
      })

    const record = inserted[0]
    if (!record) {
      throw new Error('failed to create verification token')
    }

    const payload: VerificationPayload = {
      tokenId: record.id,
      userId: record.userId,
      email: record.email,
      purpose: record.purpose as VerificationPurpose,
      expiresAt: record.expiresAt.getTime(),
    }

    return { token, expiresAt: record.expiresAt, record: payload }
  },

  async consumeToken(userId: number, token: string, purpose: VerificationPurpose = 'verify') {
    if (!token) {
      return null
    }

    const now = new Date()
    const tokenHash = hashToken(token)
    const consumed = await db.update(verificationTokens)
      .set({ consumedAt: now })
      .where(and(
        eq(verificationTokens.userId, userId),
        eq(verificationTokens.tokenHash, tokenHash),
        eq(verificationTokens.purpose, purpose),
        isNull(verificationTokens.consumedAt),
        isNull(verificationTokens.revokedAt),
        gt(verificationTokens.expiresAt, now),
      ))
      .returning({
        id: verificationTokens.id,
        userId: verificationTokens.userId,
        email: verificationTokens.email,
        purpose: verificationTokens.purpose,
        expiresAt: verificationTokens.expiresAt,
      })

    const record = consumed[0]
    if (!record) {
      return null
    }

    return {
      tokenId: record.id,
      userId: record.userId,
      email: record.email,
      purpose: record.purpose as VerificationPurpose,
      expiresAt: record.expiresAt.getTime(),
    } satisfies VerificationPayload
  },
}

/** @deprecated use verificationTokenService */
export const emailVerificationService = verificationTokenService

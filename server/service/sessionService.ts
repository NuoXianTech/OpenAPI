import { createHash, randomBytes } from 'node:crypto'
import { and, eq, gt, lt } from 'drizzle-orm'
import { sessions } from '@nuxthub/db/schema'

export interface SessionUserPayload {
  userId: number | null
  kind: 'user' | 'admin'
}

function generateSessionId() {
  return randomBytes(48).toString('base64url')
}

function hashSessionId(sessionId: string) {
  return createHash('sha256').update(sessionId).digest('base64url')
}

export const sessionService = {
  async createSession(payload: SessionUserPayload, maxAgeSeconds: number) {
    const sessionId = generateSessionId()
    const expiresAt = new Date(Date.now() + maxAgeSeconds * 1000)
    const storedSessionId = hashSessionId(sessionId)

    const res = await db.insert(sessions).values({
      sessionId: storedSessionId,
      userId: payload.userId,
      kind: payload.kind,
      expiresAt,
    }).returning()

    return { record: res[0], sessionId, expiresAt }
  },

  async getSessionById(sessionId: string) {
    const now = new Date()
    const sessionHash = hashSessionId(sessionId)
    const hashedResult = await db.select().from(sessions)
      .where(and(eq(sessions.sessionId, sessionHash), gt(sessions.expiresAt, now)))
      .limit(1)

    if (hashedResult[0]) {
      return hashedResult[0]
    }

    const legacyResult = await db.select().from(sessions)
      .where(and(eq(sessions.sessionId, sessionId), gt(sessions.expiresAt, now)))
      .limit(1)

    const legacySession = legacyResult[0]
    if (!legacySession) {
      return null
    }

    await db.update(sessions)
      .set({ sessionId: sessionHash })
      .where(eq(sessions.sessionId, sessionId))

    return {
      ...legacySession,
      sessionId: sessionHash,
    }
  },

  async deleteSession(sessionId: string) {
    const sessionHash = hashSessionId(sessionId)
    await db.delete(sessions).where(
      and(
        eq(sessions.sessionId, sessionHash),
      ),
    )
    await db.delete(sessions).where(eq(sessions.sessionId, sessionId))
  },

  async deleteSessionsByUserId(userId: number) {
    await db.delete(sessions).where(eq(sessions.userId, userId))
  },

  async deleteExpiredSessions() {
    const now = new Date()
    await db.delete(sessions).where(lt(sessions.expiresAt, now))
  },
}

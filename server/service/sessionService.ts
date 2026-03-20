import { randomBytes } from 'node:crypto'
import { and, eq, gt, lt } from 'drizzle-orm'
import { sessions } from '@nuxthub/db/schema'

export interface SessionUserPayload {
  userId: number | null
  role: string
  username: string
  email: string
}

function generateSessionId() {
  return randomBytes(48).toString('base64url')
}

export const sessionService = {
  async createSession(payload: SessionUserPayload, maxAgeSeconds: number) {
    const sessionId = generateSessionId()
    const expiresAt = new Date(Date.now() + maxAgeSeconds * 1000)

    const res = await db.insert(sessions).values({
      sessionId,
      userId: payload.userId,
      role: payload.role,
      username: payload.username,
      email: payload.email,
      expiresAt,
    }).returning()

    return { record: res[0], sessionId, expiresAt }
  },

  async getSessionById(sessionId: string) {
    const now = new Date()
    const res = await db.select().from(sessions)
      .where(and(eq(sessions.sessionId, sessionId), gt(sessions.expiresAt, now)))
      .limit(1)
    return res[0] || null
  },

  async deleteSession(sessionId: string) {
    await db.delete(sessions).where(eq(sessions.sessionId, sessionId))
  },

  async deleteExpiredSessions() {
    const now = new Date()
    await db.delete(sessions).where(lt(sessions.expiresAt, now))
  },
}

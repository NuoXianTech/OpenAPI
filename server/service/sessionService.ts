import { createHash, randomBytes } from 'node:crypto'
import { and, eq, gt, lt, desc } from 'drizzle-orm'
import { sessions } from '@nuxthub/db/schema'

export interface SessionUserPayload {
  userId: number | null
  kind: 'user' | 'admin'
  ip?: string | null
  userAgent?: string | null
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
    const now = new Date()
    const expiresAt = new Date(now.getTime() + maxAgeSeconds * 1000)
    const storedSessionId = hashSessionId(sessionId)

    const res = await db.insert(sessions).values({
      sessionId: storedSessionId,
      userId: payload.userId,
      kind: payload.kind,
      ip: payload.ip ?? null,
      userAgent: payload.userAgent?.slice(0, 500) ?? null,
      lastActiveAt: now,
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

    // 兼容旧明文 sessionId 存法，捞到后自动迁移到哈希存储。
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

  /**
   * 每次鉴权请求都调用一次，刷新会话活跃度。
   * 目前实现每次都 update 一下，简单；若要降负载可改成间隔节流（>5 分钟才写）。
   */
  async touchSession(sessionId: string) {
    const sessionHash = hashSessionId(sessionId)
    await db.update(sessions)
      .set({ lastActiveAt: new Date() })
      .where(eq(sessions.sessionId, sessionHash))
  },

  async listByUserId(userId: number) {
    return db.select().from(sessions)
      .where(eq(sessions.userId, userId))
      .orderBy(desc(sessions.lastActiveAt))
  },

  async deleteSession(sessionId: string) {
    const sessionHash = hashSessionId(sessionId)
    await db.delete(sessions).where(eq(sessions.sessionId, sessionHash))
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

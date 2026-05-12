import { createHash, randomBytes } from 'node:crypto'
import { and, eq, gt, lt, ne, desc } from 'drizzle-orm'
import { sessions } from '@nuxthub/db/schema'

export interface SessionUserPayload {
  userId: number | null
  kind: 'user' | 'admin'
  ip?: string | null
  userAgent?: string | null
  isRemembered?: boolean
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
      isRemembered: payload.isRemembered ?? false,
      lastActiveAt: now,
      expiresAt
    }).returning()

    return { record: res[0], sessionId, expiresAt }
  },

  async getSessionById(sessionId: string) {
    const now = new Date()
    const sessionHash = hashSessionId(sessionId)
    const res = await db.select().from(sessions)
      .where(and(eq(sessions.sessionId, sessionHash), gt(sessions.expiresAt, now)))
      .limit(1)

    return res[0] || null
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

  /**
   * 滑动续期：刷新活跃时间并把 expiresAt 推到调用方计算好的时间点。
   * 调用方负责取 min(滑动到期, 绝对硬顶) 后传入。
   * 仅用于未勾选「记住我」的会话；勾选「记住我」的会话保持登录时给定的固定到期时间。
   */
  async extendSessionExpiry(sessionId: string, expiresAt: Date) {
    const sessionHash = hashSessionId(sessionId)
    await db.update(sessions)
      .set({ lastActiveAt: new Date(), expiresAt })
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
  },

  async deleteSessionsByUserId(userId: number) {
    await db.delete(sessions).where(eq(sessions.userId, userId))
  },

  /** 删除该用户除当前会话以外的所有会话（用于改密码后的「其他设备下线」） */
  async deleteOtherSessionsForUser(userId: number, exceptSessionId: string) {
    const exceptHash = hashSessionId(exceptSessionId)
    await db.delete(sessions).where(and(
      eq(sessions.userId, userId),
      ne(sessions.sessionId, exceptHash)
    ))
  },

  async deleteExpiredSessions() {
    const now = new Date()
    await db.delete(sessions).where(lt(sessions.expiresAt, now))
  }
}

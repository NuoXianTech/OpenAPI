import { and, eq, isNull } from 'drizzle-orm'
import { apiKeys, sessions, users } from '@nuxthub/db/schema'
import { notificationService } from './notificationService'

// 软删除后用户行仍在表中作为外键锚点，但对所有业务查询不可见。
// 读路径必须 AND deleted_at IS NULL，写路径同理避免对僵尸行操作。
const aliveOnly = isNull(users.deletedAt)

export const usersService = {
  async list() {
    // passwordHash 永远不离开 DB，避免 admin 端浏览器扩展 / sentry / 截图泄漏后被字典攻击
    return await db.select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      email: users.email,
      credits: users.credits,
      isActive: users.isActive,
      isBanned: users.isBanned,
      bannedReason: users.bannedReason,
      bannedUntil: users.bannedUntil,
      lastLoginAt: users.lastLoginAt,
      lastLoginIp: users.lastLoginIp,
      lastLoginUserAgent: users.lastLoginUserAgent,
      emailVerifiedAt: users.emailVerifiedAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt
    }).from(users).where(aliveOnly)
  },

  async findByEmail(email: string) {
    const res = await db.select().from(users)
      .where(and(eq(users.email, email), aliveOnly))
      .limit(1)
    return res[0]
  },

  async findByUsername(username: string) {
    const res = await db.select().from(users)
      .where(and(eq(users.username, username), aliveOnly))
      .limit(1)
    return res[0]
  },

  async getById(id: number) {
    const res = await db.select().from(users)
      .where(and(eq(users.id, id), aliveOnly))
      .limit(1)
    return res[0]
  },

  async updateUser(id: number, data: Partial<{
    username: string
    email: string
    displayName: string | null
    isActive: boolean
    isBanned: boolean
    passwordHash: string
  }>) {
    const res = await db.update(users)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(and(eq(users.id, id), aliveOnly))
      .returning()

    return res[0] || null
  },

  /**
   * 软删除：写 deletedAt 时间戳，同时强制吊销该用户所有 API Key 并踢出全部会话。
   * 用户行本身保留，让 creditTransactions / apiCalls / operationLogs 等审计链不丢失指向。
   * 邮箱/用户名 unique 索引带 WHERE deleted_at IS NULL，软删后原值可被新注册复用。
   */
  async deleteUser(id: number) {
    return await db.transaction(async (tx: typeof db) => {
      const res = await tx.update(users)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(users.id, id), aliveOnly))
        .returning()
      const deleted = res[0]
      if (!deleted) return null

      // 吊销该用户全部未吊销的 API Key，防止已签发凭证继续走 apiGuard
      await tx.update(apiKeys)
        .set({ isActive: false, revokedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(apiKeys.userId, id), isNull(apiKeys.revokedAt)))

      // 直接清掉会话；sessions 外键还是 cascade，但这里软删不会触发 cascade，所以显式删
      await tx.delete(sessions).where(eq(sessions.userId, id))

      return deleted
    })
  },

  async addUser(data: {
    username: string
    email: string
    passwordHash: string
    displayName?: string
    isActive?: boolean
  }) {
    const res = await db
      .insert(users)
      .values({
        username: data.username,
        email: data.email,
        passwordHash: data.passwordHash,
        displayName: data.displayName || data.username,
        isActive: data.isActive ?? false,
        isBanned: false
      })
      .returning()

    return res[0]
  },

  async updateLastLogin(id: number, ip: string) {
    const res = await db.update(users)
      .set({
        lastLoginAt: new Date(),
        lastLoginIp: ip
      })
      .where(and(eq(users.id, id), aliveOnly))
      .returning()

    return res[0]
  },

  async activateUser(id: number) {
    const res = await db.update(users)
      .set({
        isActive: true,
        emailVerifiedAt: new Date()
      })
      .where(and(eq(users.id, id), aliveOnly))
      .returning()

    // 用户首次激活时补发所有 audience='all_with_future' 的历史消息
    // ON CONFLICT DO NOTHING 保证幂等：已存在的投递不会重复
    if (res[0]) {
      try {
        await notificationService.fanOutFutureMessagesTo(id)
      } catch (err) {
        // 通知补发失败不应阻塞激活流程，仅记录日志
        console.error('failed to fan out future notifications', { userId: id, err })
      }
    }

    return res[0]
  },

  async updatePasswordHash(id: number, passwordHash: string) {
    const res = await db.update(users)
      .set({
        passwordHash,
        updatedAt: new Date()
      })
      .where(and(eq(users.id, id), aliveOnly))
      .returning()
    return res[0] || null
  },

  async updateEmail(id: number, email: string) {
    const res = await db.update(users)
      .set({
        email,
        emailVerifiedAt: new Date(),
        updatedAt: new Date()
      })
      .where(and(eq(users.id, id), aliveOnly))
      .returning()
    return res[0] || null
  },

  async banUser(id: number, isBanned: boolean) {
    const res = await db.update(users)
      .set({
        isBanned,
        updatedAt: new Date()
      })
      .where(and(eq(users.id, id), aliveOnly))
      .returning()

    return res[0] || null
  }
}

import { and, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm'
import { creditTransactions, users } from '@nuxthub/db/schema'
import { notificationService } from './notification-service'
import { siteSettingsService } from './site-settings-service'

// 删除用户走真正的 DELETE：users 行物理消失，附属表通过 FK 级联自动清理：
//   - oauthAccounts / apiKeys / notificationDeliveries / loginLogs
//     全部 cascade 一并清除（账号级数据）
//   - pendingCharges cascade 清除（待重试扣费在用户消失后无意义）
// 日志类表（creditTransactions / apiCalls / operationLogs）
// 已通过解除外键约束保留为整数快照，不会随用户消失。
export const usersService = {
  async list(opts: { keyword?: string } = {}) {
    // passwordHash 永远不离开 DB，避免 admin 端浏览器扩展 / sentry / 截图泄漏后被字典攻击
    const kw = opts.keyword?.trim().toLowerCase()
    // 关键字过滤下推到 SQL（username / email / displayName 不区分大小写包含匹配），
    // 取代旧版"全量拉取后在 handler 内存 filter"。沿用 operationLogService.list 的三元构建范式。
    const where = kw
      ? or(
          ilike(users.username, `%${kw}%`),
          ilike(users.email, `%${kw}%`),
          ilike(users.displayName, `%${kw}%`)
        )
      : undefined

    const base = db.select({
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
    }).from(users)

    return (where ? base.where(where) : base).orderBy(desc(users.createdAt))
  },

  async findByEmail(email: string) {
    const res = await db.select().from(users)
      .where(eq(users.email, email))
      .limit(1)
    return res[0]
  },

  async findByUsername(username: string) {
    const res = await db.select().from(users)
      .where(eq(users.username, username))
      .limit(1)
    return res[0]
  },

  async getById(id: number) {
    const res = await db.select().from(users)
      .where(eq(users.id, id))
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
      .where(eq(users.id, id))
      .returning()

    return res[0] || null
  },

  /**
   * 硬删除：物理 DELETE，FK cascade 自动清理 apiKeys / oauthAccounts /
   * notificationDeliveries / loginLogs / pendingCharges。
   * creditTransactions / apiCalls / operationLogs 已解除 FK，
   * 自动以 userId 整数快照保留历史。
   */
  async deleteUser(id: number) {
    const res = await db.delete(users)
      .where(eq(users.id, id))
      .returning()
    return res[0] || null
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

  async updateLastLogin(id: number, ip: string, userAgent?: string | null) {
    const res = await db.update(users)
      .set({
        lastLoginAt: new Date(),
        lastLoginIp: ip,
        lastLoginUserAgent: userAgent ?? null
      })
      .where(eq(users.id, id))
      .returning()

    return res[0]
  },

  /**
   * 激活账号 · 首次激活赠送默认积分。
   *
   * 用 emailVerifiedAt IS NULL 作为"首次激活"判定：
   *   - 邮箱验证流程：addUser 时 emailVerifiedAt=null → 这里 set + 赠分
   *   - OAuth 自动注册：addUser 时 emailVerifiedAt=null，oauthCallback 显式调本方法 → 同样首次赠分
   *   - 已激活账号再次调本方法（极少见，例如手工调用）：WHERE 失败，不重复赠分
   *
   * 通知补发（audience='all_with_future'）也只在首次激活时触发。
   */
  async activateUser(id: number) {
    const settings = await siteSettingsService.getOrCreate()
    const grantAmount = Math.max(Math.trunc(settings.defaultRegisterCredits || 0), 0)

    const activated = await db.transaction(async (tx: typeof db) => {
      const res = await tx.update(users)
        .set({
          isActive: true,
          emailVerifiedAt: new Date()
        })
        .where(and(eq(users.id, id), isNull(users.emailVerifiedAt)))
        .returning()
      const row = res[0]
      if (!row) return null

      if (grantAmount > 0) {
        const updated = await tx.update(users)
          .set({
            credits: sql`${users.credits} + ${grantAmount}`,
            updatedAt: new Date()
          })
          .where(eq(users.id, id))
          .returning({ credits: users.credits })

        const balanceAfter = Number(updated[0]?.credits || 0)
        await tx.insert(creditTransactions).values({
          userId: id,
          amount: grantAmount,
          balanceAfter,
          reason: 'signup_bonus',
          operatorId: null,
          operatorName: null,
          remark: '注册赠送'
        })
        return { ...row, credits: balanceAfter }
      }

      return row
    })

    if (activated) {
      // 用户首次激活时补发所有 audience='all_with_future' 的历史消息
      // ON CONFLICT DO NOTHING 保证幂等：已存在的投递不会重复
      try {
        await notificationService.fanOutFutureMessagesTo(id)
      } catch (err) {
        // 通知补发失败不应阻塞激活流程，仅记录日志
        console.error('failed to fan out future notifications', { userId: id, err })
      }
    }

    return activated
  },

  async updatePasswordHash(id: number, passwordHash: string) {
    const res = await db.update(users)
      .set({
        passwordHash,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
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
      .where(eq(users.id, id))
      .returning()
    return res[0] || null
  },

  /**
   * 封禁 / 解封。
   * - 封禁：写入 isBanned=true 以及 bannedReason / bannedUntil（bannedUntil 为 null 表示永久）
   * - 解封：清空 isBanned 及 bannedReason / bannedUntil，避免遗留过期数据
   */
  async banUser(id: number, isBanned: boolean, opts?: { reason?: string | null, bannedUntil?: Date | null }) {
    const res = await db.update(users)
      .set({
        isBanned,
        bannedReason: isBanned ? (opts?.reason?.trim() || null) : null,
        bannedUntil: isBanned ? (opts?.bannedUntil ?? null) : null,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning()

    return res[0] || null
  },

  /** 封禁已到期 → 惰性解封：清除 isBanned / bannedReason / bannedUntil。 */
  async clearExpiredBan(id: number) {
    const res = await db.update(users)
      .set({
        isBanned: false,
        bannedReason: null,
        bannedUntil: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning()

    return res[0] || null
  },

  /** 令该用户所有已签发 JWT 失效（改密 / 重置 / 全局登出）：tokenVersion 自增。 */
  async bumpTokenVersion(id: number) {
    const res = await db.update(users)
      .set({
        tokenVersion: sql`${users.tokenVersion} + 1`,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning()

    return res[0] || null
  }
}

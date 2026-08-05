import { and, asc, count, desc, eq, ilike, isNull, like, lte, or, sql } from 'drizzle-orm'
import { createError } from 'h3'
import { db } from '~~/server/db/client'
import { creditTransactions, operationLogs, users } from '~~/server/db/schema'
import { toNumber } from '~~/server/utils/number'
import { normalizePagination } from '~~/server/utils/pagination'
import { expectFirstRow, firstRow } from '~~/server/utils/row'
import { notificationService } from './notification-service'
import { systemSettingsService } from './system-settings-service'
import type { DatabaseTransaction } from '~~/server/db/client'
import type { SupportedLocale } from '#shared/config/locale-defaults'

export const USER_ROLES = {
  user: 'user',
  admin: 'admin'
} as const

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES]

interface AdminAvailabilityUser {
  role: string
  isActive: boolean
  isBanned: boolean
}

interface AdminAccessPatch {
  role?: UserRole
  isActive?: boolean
  isBanned?: boolean
}

interface AdminUserListOptions {
  keyword?: string
  userId?: number
  role?: UserRole
  isActive?: boolean
  isBanned?: boolean
  limit?: number
  offset?: number
}

function isAvailableAdmin(user: AdminAvailabilityUser) {
  return user.role === USER_ROLES.admin && user.isActive && !user.isBanned
}

async function lockAvailableAdmins(tx: DatabaseTransaction) {
  return tx.select({ id: users.id }).from(users)
    .where(and(eq(users.role, USER_ROLES.admin), eq(users.isActive, true), eq(users.isBanned, false)))
    .orderBy(asc(users.id))
    .for('update')
}

function throwAvailableAdminRequired() {
  throw createError({ statusCode: 400, message: '至少需要保留一个管理员账号' })
}

// 删除用户走真正的 DELETE：users 行物理消失，附属表通过 FK 级联自动清理：
//   - oauthAccounts / apiKeys / notificationDeliveries
//     全部 cascade 一并清除（账号级数据）
//   - pendingCharges cascade 清除（待重试扣费在用户消失后无意义）
// 登录事件已并入 operationLogs，删除用户时显式清理 auth.login.* 事件；
// 日志类表（creditTransactions / apiCalls / operationLogs）
// 已通过解除外键约束保留为整数快照，不会随用户消失。
export const usersService = {
  async list(opts: AdminUserListOptions = {}) {
    // passwordHash 永远不离开 DB，避免 admin 端浏览器扩展 / sentry / 截图泄漏后被字典攻击
    const kw = opts.keyword?.trim().toLowerCase()
    // 关键字、用户 ID、角色、激活及封禁条件统一下推到 SQL，避免在 handler 中全量过滤。
    const where = and(
      kw
        ? or(
            ilike(users.username, `%${kw}%`),
            ilike(users.email, `%${kw}%`),
            ilike(users.displayName, `%${kw}%`)
          )
        : undefined,
      opts.userId ? eq(users.id, opts.userId) : undefined,
      opts.role ? eq(users.role, opts.role) : undefined,
      typeof opts.isActive === 'boolean' ? eq(users.isActive, opts.isActive) : undefined,
      typeof opts.isBanned === 'boolean' ? eq(users.isBanned, opts.isBanned) : undefined
    )
    const { limit, offset } = normalizePagination(opts, { defaultLimit: 20 })

    const base = db.select({
      id: users.id,
      role: users.role,
      username: users.username,
      displayName: users.displayName,
      email: users.email,
      credits: users.credits,
      isActive: users.isActive,
      isBanned: users.isBanned,
      bannedReason: users.bannedReason,
      bannedUntil: users.bannedUntil,
      createdAt: users.createdAt
    }).from(users)

    const [items, totalRows] = await Promise.all([
      base.where(where).orderBy(desc(users.createdAt)).limit(limit).offset(offset),
      db.select({ value: count() }).from(users).where(where)
    ])

    return { items, total: toNumber(totalRows[0]?.value) }
  },

  async listNotificationRecipients() {
    return db.select({
      id: users.id,
      username: users.username,
      email: users.email
    })
      .from(users)
      .where(eq(users.isBanned, false))
      .orderBy(asc(users.username))
  },

  async findByEmail(email: string, opts: { role?: UserRole } = {}) {
    const where = opts.role
      ? and(eq(users.email, email), eq(users.role, opts.role))
      : eq(users.email, email)
    const res = await db.select().from(users)
      .where(where)
      .limit(1)
    return firstRow(res)
  },

  async findByUsername(username: string, opts: { role?: UserRole } = {}) {
    const where = opts.role
      ? and(eq(users.username, username), eq(users.role, opts.role))
      : eq(users.username, username)
    const res = await db.select().from(users)
      .where(where)
      .limit(1)
    return firstRow(res)
  },

  async hasAdmin() {
    const res = await db.select({ id: users.id }).from(users)
      .where(eq(users.role, USER_ROLES.admin))
      .limit(1)
    return Boolean(res[0])
  },

  async countAdmins() {
    const res = await db.select({ count: sql<number>`count(*)` }).from(users)
      .where(eq(users.role, USER_ROLES.admin))
    return toNumber(res[0]?.count)
  },

  willRemoveAdminAccess(user: AdminAvailabilityUser, patch: AdminAccessPatch) {
    return user.role === USER_ROLES.admin
      && (patch.role === USER_ROLES.user || patch.isActive === false || patch.isBanned === true)
  },

  async getById(id: number) {
    const res = await db.select().from(users)
      .where(eq(users.id, id))
      .limit(1)
    return firstRow(res)
  },

  async updateUser(id: number, data: Partial<{
    username: string
    role: UserRole
    email: string
    displayName: string | null
    locale: SupportedLocale | null
    isActive: boolean
    isBanned: boolean
    passwordHash: string
  }>) {
    const removesAdminAccess = data.role === USER_ROLES.user || data.isActive === false || data.isBanned === true
    const values = {
      ...data,
      ...(data.passwordHash ? { tokenVersion: sql`${users.tokenVersion} + 1` } : {}),
      updatedAt: new Date()
    }

    if (!removesAdminAccess) {
      const res = await db.update(users)
        .set(values)
        .where(eq(users.id, id))
        .returning()
      return firstRow(res)
    }

    return db.transaction(async (tx: DatabaseTransaction) => {
      const availableAdmins = await lockAvailableAdmins(tx)
      const currentRows = await tx.select().from(users)
        .where(eq(users.id, id))
        .limit(1)
        .for('update')
      const current = firstRow(currentRows)
      if (!current) return undefined

      if (removesAdminAccess && isAvailableAdmin(current) && availableAdmins.length <= 1) {
        throwAvailableAdminRequired()
      }

      const res = await tx.update(users)
        .set(values)
        .where(eq(users.id, id))
        .returning()

      return firstRow(res)
    })
  },

  /**
   * 硬删除：物理 DELETE，FK cascade 自动清理 apiKeys / oauthAccounts /
   * notificationDeliveries / pendingCharges；auth.login.* 事件显式删除。
   * creditTransactions / apiCalls / operationLogs 已解除 FK，
   * 自动以 userId 整数快照保留历史。
   */
  async deleteUser(id: number) {
    return db.transaction(async (tx: DatabaseTransaction) => {
      const availableAdmins = await lockAvailableAdmins(tx)
      const currentRows = await tx.select().from(users)
        .where(eq(users.id, id))
        .limit(1)
        .for('update')
      const current = firstRow(currentRows)
      if (!current) return undefined
      if (isAvailableAdmin(current) && availableAdmins.length <= 1) {
        throwAvailableAdminRequired()
      }

      await tx.delete(operationLogs).where(and(
        eq(operationLogs.userId, id),
        like(operationLogs.action, 'auth.login.%')
      ))
      const res = await tx.delete(users)
        .where(eq(users.id, id))
        .returning()
      return firstRow(res)
    })
  },

  async addUser(data: {
    username: string
    email: string
    passwordHash: string
    role?: UserRole
    displayName?: string
    isActive?: boolean
    emailVerifiedAt?: Date | null
  }) {
    const res = await db
      .insert(users)
      .values({
        role: data.role ?? USER_ROLES.user,
        username: data.username,
        email: data.email,
        passwordHash: data.passwordHash,
        displayName: data.displayName || data.username,
        isActive: data.isActive ?? false,
        emailVerifiedAt: data.emailVerifiedAt ?? null,
        isBanned: false
      })
      .returning()

    return expectFirstRow(res, 'Failed to create user.')
  },

  async updateLastLogin(id: number, ip: string | null, userAgent?: string | null) {
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
    const settings = await systemSettingsService.getSettings()
    const grantAmount = Math.max(Math.trunc(settings.defaultRegisterCredits || 0), 0)

    const activated = await db.transaction(async (tx: DatabaseTransaction) => {
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

        const balanceAfter = toNumber(updated[0]?.credits)
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

  async updatePasswordAndInvalidateSessions(id: number, passwordHash: string) {
    const res = await db.update(users)
      .set({
        passwordHash,
        tokenVersion: sql`${users.tokenVersion} + 1`,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning()
    return firstRow(res)
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
    return firstRow(res)
  },

  /**
   * 封禁 / 解封。
   * - 封禁：写入 isBanned=true 以及 bannedReason / bannedUntil（bannedUntil 为 null 表示永久）
   * - 解封：清空 isBanned 及 bannedReason / bannedUntil，避免遗留过期数据
   */
  async banUser(id: number, isBanned: boolean, opts?: { reason?: string | null, bannedUntil?: Date | null }) {
    const values = {
      isBanned,
      bannedReason: isBanned ? (opts?.reason?.trim() || null) : null,
      bannedUntil: isBanned ? (opts?.bannedUntil ?? null) : null,
      updatedAt: new Date()
    }

    if (!isBanned) {
      const res = await db.update(users)
        .set(values)
        .where(eq(users.id, id))
        .returning()
      return firstRow(res)
    }

    return db.transaction(async (tx: DatabaseTransaction) => {
      const availableAdmins = await lockAvailableAdmins(tx)
      const currentRows = await tx.select().from(users)
        .where(eq(users.id, id))
        .limit(1)
        .for('update')
      const current = firstRow(currentRows)
      if (!current) return undefined
      if (isBanned && isAvailableAdmin(current) && availableAdmins.length <= 1) {
        throwAvailableAdminRequired()
      }

      const res = await tx.update(users)
        .set(values)
        .where(eq(users.id, id))
        .returning()

      return firstRow(res)
    })
  },

  /** 封禁已到期 → 惰性解封：清除 isBanned / bannedReason / bannedUntil。 */
  async clearExpiredBan(id: number) {
    const now = new Date()
    const res = await db.update(users)
      .set({
        isBanned: false,
        bannedReason: null,
        bannedUntil: null,
        updatedAt: new Date()
      })
      .where(and(
        eq(users.id, id),
        eq(users.isBanned, true),
        lte(users.bannedUntil, now)
      ))
      .returning()

    return firstRow(res)
  },
}

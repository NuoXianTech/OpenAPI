import { and, count, desc, eq, gte, lte, type SQL } from 'drizzle-orm'
import { loginLogs } from '@nuxthub/db/schema'

/**
 * 登录日志服务（对应需求 #7）
 *
 * 只记录"已识别用户"的登录尝试（success=true / false）：
 *   - 已识别 = 用户名 / 邮箱已命中 users 表中真实存在的行
 *   - 未识别（用户输入的账号不存在）→ 不写日志，仅依赖 rate limit / Turnstile 抗扫
 *
 * userId 与 users 表 FK cascade，用户硬删时该用户全部登录历史一并清除。
 */

export type LoginMethod = 'password' | 'oauth_github' | 'oauth_qq'

export type LoginFailureReason
  = | 'invalid_password' // 密码错误
    | 'banned' // 账号已被封禁
    | 'not_active' // 账号未激活（邮箱未验证）
    | 'oauth_user_unavailable' // OAuth 命中的账号已被删除/不可用

export interface RecordLoginInput {
  userId: number
  method: LoginMethod
  success: boolean
  failureReason?: LoginFailureReason | null
  ip?: string | null
  userAgent?: string | null
}

export interface ListFilters {
  userId?: number
  method?: LoginMethod
  success?: boolean
  startAt?: Date
  endAt?: Date
  limit?: number
  offset?: number
}

export const loginLogService = {
  /**
   * 写入一条登录日志。失败不抛错，不阻塞登录流程。
   */
  async record(input: RecordLoginInput) {
    try {
      await db.insert(loginLogs).values({
        userId: input.userId,
        method: input.method,
        success: input.success,
        failureReason: input.failureReason ?? null,
        ip: input.ip ?? null,
        userAgent: input.userAgent?.slice(0, 500) ?? null
      })
    } catch (err) {
      console.error('failed to write login log', { input, err })
    }
  },

  async list(filters: ListFilters = {}) {
    const conditions: SQL[] = []
    if (typeof filters.userId === 'number') conditions.push(eq(loginLogs.userId, filters.userId))
    if (filters.method) conditions.push(eq(loginLogs.method, filters.method))
    if (typeof filters.success === 'boolean') conditions.push(eq(loginLogs.success, filters.success))
    if (filters.startAt) conditions.push(gte(loginLogs.createdAt, filters.startAt))
    if (filters.endAt) conditions.push(lte(loginLogs.createdAt, filters.endAt))

    const limit = Math.min(Math.max(Math.trunc(filters.limit ?? 50), 1), 200)
    const offset = Math.max(Math.trunc(filters.offset ?? 0), 0)
    const where = conditions.length ? and(...conditions) : undefined

    const [items, totalRows] = await Promise.all([
      where
        ? db.select().from(loginLogs).where(where).orderBy(desc(loginLogs.createdAt)).limit(limit).offset(offset)
        : db.select().from(loginLogs).orderBy(desc(loginLogs.createdAt)).limit(limit).offset(offset),
      where
        ? db.select({ value: count() }).from(loginLogs).where(where)
        : db.select({ value: count() }).from(loginLogs)
    ])

    return { items, total: Number(totalRows[0]?.value || 0) }
  }
}

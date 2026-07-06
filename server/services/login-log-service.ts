import { and, count, desc, eq, gte, lte, type SQL } from 'drizzle-orm'
import { loginLogs, users } from '@nuxthub/db/schema'
import { toNumber } from '~~/server/utils/number'
import { normalizePagination } from '~~/server/utils/pagination'
import type { LoginFailureReason, LoginMethod } from '~~/shared/types/login-log'

/**
 * 登录日志服务（对应需求 #7）
 *
 * 只记录"已识别用户"的登录尝试（success=true / false）：
 *   - 已识别 = 用户名 / 邮箱已命中 users 表中真实存在的行
 *   - 未识别（用户输入的账号不存在）→ 不写日志，仅依赖 rate limit / Turnstile 抗扫
 *
 * userId 与 users 表 FK cascade，用户硬删时该用户全部登录历史一并清除。
 *
 * LoginMethod / LoginFailureReason 的权威定义在 shared/types/login-log.ts，
 * 这里 re-export 供登录流程（login.post.ts / oauth-callback.ts）按旧路径继续引用。
 */
export type { LoginFailureReason, LoginMethod }

/** login_logs 整行（list 返回的元素类型） */
type LoginLogRecord = typeof loginLogs.$inferSelect

/** listForAdmin 返回的元素：login_logs 行投影 + 用户名快照（leftJoin users） */
interface AdminLoginLogRecord {
  id: number
  userId: number
  username: string | null
  method: string
  success: boolean
  failureReason: string | null
  ip: string | null
  userAgent: string | null
  createdAt: Date
}

interface RecordLoginInput {
  userId: number
  method: LoginMethod
  success: boolean
  failureReason?: LoginFailureReason | null
  ip?: string | null
  userAgent?: string | null
}

interface ListFilters {
  userId?: number
  method?: LoginMethod
  success?: boolean
  startAt?: Date
  endAt?: Date
  limit?: number
  offset?: number
}

function buildConditions(filters: ListFilters): SQL[] {
  const conditions: SQL[] = []
  if (typeof filters.userId === 'number') conditions.push(eq(loginLogs.userId, filters.userId))
  if (filters.method) conditions.push(eq(loginLogs.method, filters.method))
  if (typeof filters.success === 'boolean') conditions.push(eq(loginLogs.success, filters.success))
  if (filters.startAt) conditions.push(gte(loginLogs.createdAt, filters.startAt))
  if (filters.endAt) conditions.push(lte(loginLogs.createdAt, filters.endAt))
  return conditions
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

  /**
   * 单表查询登录日志。user 端「最近登录活动」用：传 userId 只取本人记录。
   */
  async list(filters: ListFilters = {}): Promise<{ items: LoginLogRecord[], total: number }> {
    const conditions = buildConditions(filters)
    const { limit, offset } = normalizePagination(filters)
    const where = conditions.length ? and(...conditions) : undefined

    const [items, totalRows] = await Promise.all([
      where
        ? db.select().from(loginLogs).where(where).orderBy(desc(loginLogs.createdAt)).limit(limit).offset(offset)
        : db.select().from(loginLogs).orderBy(desc(loginLogs.createdAt)).limit(limit).offset(offset),
      where
        ? db.select({ value: count() }).from(loginLogs).where(where)
        : db.select({ value: count() }).from(loginLogs)
    ])

    return { items, total: toNumber(totalRows[0]?.value) }
  },

  /**
   * 管理后台登录日志列表：在 list 的筛选基础上 leftJoin users 取用户名快照，
   * 便于管理员按用户名识别记录。userId 已是稳定整数，username 仅用于展示。
   */
  async listForAdmin(filters: ListFilters = {}): Promise<{ items: AdminLoginLogRecord[], total: number }> {
    const conditions = buildConditions(filters)
    const { limit, offset } = normalizePagination(filters)
    const where = conditions.length ? and(...conditions) : undefined

    const baseSelect = db.select({
      id: loginLogs.id,
      userId: loginLogs.userId,
      username: users.username,
      method: loginLogs.method,
      success: loginLogs.success,
      failureReason: loginLogs.failureReason,
      ip: loginLogs.ip,
      userAgent: loginLogs.userAgent,
      createdAt: loginLogs.createdAt
    })
      .from(loginLogs)
      .leftJoin(users, eq(users.id, loginLogs.userId))

    const countQuery = db.select({ value: count() }).from(loginLogs)

    const [items, totalRows] = await Promise.all([
      (where ? baseSelect.where(where) : baseSelect)
        .orderBy(desc(loginLogs.createdAt))
        .limit(limit)
        .offset(offset),
      where ? countQuery.where(where) : countQuery
    ])

    return { items, total: toNumber(totalRows[0]?.value) }
  }
}

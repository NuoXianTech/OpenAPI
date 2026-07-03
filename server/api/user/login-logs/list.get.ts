import type { H3Event } from 'h3'
import { loginLogService } from '~~/server/service/loginLogService'
import { requireAuth } from '~~/server/utils/auth'
import { readPaginationQuery } from '~~/server/utils/requestPagination'
import { summarizeUserAgent } from '~~/server/utils/userAgent'
import type { LoginLogRow } from '~~/shared/types/login-log'

/**
 * 用户「最近登录活动」：只返回当前登录用户本人的登录日志（成功 + 失败）。
 * 让用户能察觉异常登录 / 盗号尝试。userId 强制取自会话，不接受 query 传入。
 */
export default defineEventHandler(async (event: H3Event) => {
  const user = await requireAuth(event)
  const { limit, offset } = readPaginationQuery(event, { defaultLimit: 10 })

  const { items, total } = await loginLogService.list({
    userId: user.id,
    limit,
    offset
  })

  const rows: LoginLogRow[] = items.map(r => ({
    id: r.id,
    method: r.method,
    success: r.success,
    failureReason: r.failureReason,
    ip: r.ip,
    device: summarizeUserAgent(r.userAgent),
    userAgent: r.userAgent,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : new Date(r.createdAt).toISOString()
  }))

  return { items: rows, total }
})

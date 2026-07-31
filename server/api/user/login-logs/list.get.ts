import { loginLogService } from '~~/server/services/login-log-service'
import { defineAuthenticatedEventHandler } from '~~/server/utils/auth'
import { toIsoString } from '~~/server/utils/date'
import { summarizeUserAgent } from '~~/server/utils/user-agent'
import type { LoginLogRow } from '#shared/types/login-log'

const RECENT_LOGIN_ACTIVITY_LIMIT = 10

/**
 * 用户「最近登录活动」：只返回当前登录用户本人的登录日志（成功 + 失败）。
 * 固定返回最新 10 条，让用户能察觉异常登录 / 盗号尝试。
 * userId 强制取自会话，不接受 query 传入。
 */
export default defineAuthenticatedEventHandler(async (_event, user) => {
  const { items, total } = await loginLogService.list({
    userId: user.id,
    limit: RECENT_LOGIN_ACTIVITY_LIMIT,
    offset: 0
  })

  const rows: LoginLogRow[] = items.map(r => ({
    id: r.id,
    method: r.method,
    success: r.success,
    failureReason: r.failureReason,
    ip: r.ip,
    device: summarizeUserAgent(r.userAgent),
    userAgent: r.userAgent,
    createdAt: toIsoString(r.createdAt)
  }))

  return { items: rows, total }
})

import type { H3Event } from 'h3'
import { loginLogService } from '~~/server/services/login-log-service'
import { requireAdmin } from '~~/server/utils/auth'
import { toIsoString } from '~~/server/utils/date'
import { readPaginationQuery } from '~~/server/utils/request-pagination'
import { readQueryDate, readQueryNumber, readQueryOption, readQueryString } from '~~/server/utils/request-query'
import { summarizeUserAgent } from '~~/server/utils/user-agent'
import type { AdminLoginLogRow, LoginMethod } from '~~/shared/types/login-log'

const VALID_METHODS: LoginMethod[] = ['password', 'oauth_github', 'oauth_qq']

function parseMethod(value: unknown): LoginMethod | undefined {
  return readQueryOption(value, VALID_METHODS)
}

function parseSuccess(value: unknown): boolean | undefined {
  const v = readQueryString(value).trim()
  if (v === 'success' || v === 'true') return true
  if (v === 'failure' || v === 'false') return false
  return undefined
}

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  const { query, limit, offset } = readPaginationQuery(event)

  const { items, total } = await loginLogService.listForAdmin({
    startAt: readQueryDate(query.startAt),
    endAt: readQueryDate(query.endAt),
    method: parseMethod(query.method),
    success: parseSuccess(query.success),
    userId: readQueryNumber(query.userId),
    limit,
    offset
  })

  const rows: AdminLoginLogRow[] = items.map(r => ({
    id: r.id,
    userId: r.userId,
    username: r.username,
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

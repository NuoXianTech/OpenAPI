import type { H3Event } from 'h3'
import { getQuery } from 'h3'
import { loginLogService } from '~~/server/service/loginLogService'
import { requireAdmin } from '~~/server/utils/auth'
import { parsePaginationQuery } from '~~/server/utils/pagination'
import { summarizeUserAgent } from '~~/server/utils/userAgent'
import type { AdminLoginLogRow, LoginMethod } from '~~/shared/types/login-log'

function parseDate(value: unknown): Date | undefined {
  if (!value) return undefined
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? undefined : date
}

const VALID_METHODS: LoginMethod[] = ['password', 'oauth_github', 'oauth_qq']

function parseMethod(value: unknown): LoginMethod | undefined {
  const v = String(value || '').trim()
  return (VALID_METHODS as string[]).includes(v) ? (v as LoginMethod) : undefined
}

function parseSuccess(value: unknown): boolean | undefined {
  const v = String(value || '').trim()
  if (v === 'success' || v === 'true') return true
  if (v === 'failure' || v === 'false') return false
  return undefined
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  const query = getQuery(event)
  const { limit, offset } = parsePaginationQuery(query)

  const { items, total } = await loginLogService.listForAdmin({
    startAt: parseDate(query.startAt),
    endAt: parseDate(query.endAt),
    method: parseMethod(query.method),
    success: parseSuccess(query.success),
    userId: query.userId ? Number(query.userId) : undefined,
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
    createdAt: toIso(r.createdAt)
  }))

  return { items: rows, total }
})

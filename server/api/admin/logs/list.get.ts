import type { H3Event } from 'h3'
import { adminLogsService } from '~~/server/service/adminLogsService'
import { requireAdmin } from '~~/server/utils/auth'
import { readPaginationQuery } from '~~/server/utils/requestPagination'
import { ADMIN_LOG_TYPES, type AdminLogType } from '~~/shared/types/admin-logs'

function parseDate(value: unknown): Date | undefined {
  if (!value) return undefined
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? undefined : date
}

function parseTypes(value: unknown): AdminLogType[] | undefined {
  if (!value) return undefined
  const raw = Array.isArray(value) ? value : String(value).split(',')
  const filtered = raw
    .map(v => String(v).trim())
    .filter((v): v is AdminLogType => (ADMIN_LOG_TYPES as string[]).includes(v))
  return filtered.length ? filtered : undefined
}

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  const { query, limit, offset } = readPaginationQuery(event)

  const data = await adminLogsService.listLogs({
    startAt: parseDate(query.startAt),
    endAt: parseDate(query.endAt),
    apiId: query.apiId ? Number(query.apiId) : undefined,
    categoryId: query.categoryId ? Number(query.categoryId) : undefined,
    types: parseTypes(query.types),
    userId: query.userId ? Number(query.userId) : undefined,
    apiKeyId: query.apiKeyId ? Number(query.apiKeyId) : undefined,
    requestId: query.requestId ? String(query.requestId).trim() : undefined,
    limit,
    offset
  })
  return data
})

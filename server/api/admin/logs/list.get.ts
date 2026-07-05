import type { H3Event } from 'h3'
import { adminLogsService } from '~~/server/services/admin-logs-service'
import { requireAdmin } from '~~/server/utils/auth'
import { readPaginationQuery } from '~~/server/utils/request-pagination'
import { readQueryDate, readQueryNumber, readQueryText } from '~~/server/utils/request-query'
import { ADMIN_LOG_TYPES, type AdminLogType } from '~~/shared/types/admin-logs'

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
    startAt: readQueryDate(query.startAt),
    endAt: readQueryDate(query.endAt),
    apiId: readQueryNumber(query.apiId),
    categoryId: readQueryNumber(query.categoryId),
    types: parseTypes(query.types),
    userId: readQueryNumber(query.userId),
    apiKeyId: readQueryNumber(query.apiKeyId),
    requestId: readQueryText(query.requestId),
    limit,
    offset
  })
  return data
})

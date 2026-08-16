import { adminApiCallLogService } from '~~/server/services/admin-api-call-log-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readPaginationQuery } from '~~/server/utils/pagination'
import { readQueryDate, readQueryNumber, readQueryText } from '~~/server/utils/request-query'
import { ADMIN_LOG_TYPES, type AdminLogType } from '#shared/types/admin'

function parseTypes(value: unknown): AdminLogType[] | undefined {
  if (!value) return undefined
  const raw = Array.isArray(value) ? value : String(value).split(',')
  const filtered = raw
    .map(v => String(v).trim())
    .filter((v): v is AdminLogType => (ADMIN_LOG_TYPES as string[]).includes(v))
  return filtered.length ? filtered : undefined
}

export default defineAdminEventHandler(async (event) => {
  const { query, limit, offset } = readPaginationQuery(event, { defaultLimit: 20 })

  const data = await adminApiCallLogService.listLogs({
    keyword: readQueryText(query.keyword),
    startAt: readQueryDate(query.startAt),
    endAt: readQueryDate(query.endAt),
    routeId: readQueryText(query.routeId),
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

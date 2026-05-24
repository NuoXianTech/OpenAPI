import type { H3Event } from 'h3'
import { getQuery } from 'h3'
import { redemptionService } from '~~/server/service/redemptionService'
import { requireAdmin } from '~~/server/utils/auth'

function parseDate(value: unknown): Date | undefined {
  if (!value) return undefined
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? undefined : date
}

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  const query = getQuery(event)

  return redemptionService.listRedemptions({
    codeId: query.codeId ? Number(query.codeId) : undefined,
    userId: query.userId ? Number(query.userId) : undefined,
    username: (query.username || '').toString().trim() || undefined,
    batchId: (query.batchId || '').toString().trim() || undefined,
    startAt: parseDate(query.startAt),
    endAt: parseDate(query.endAt),
    limit: query.limit ? Number(query.limit) : undefined,
    offset: query.offset ? Number(query.offset) : undefined
  })
})

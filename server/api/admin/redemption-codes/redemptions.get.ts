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

  const codeId = query.codeId ? Number(query.codeId) : undefined
  const userId = query.userId ? Number(query.userId) : undefined
  const batchId = (query.batchId || '').toString().trim() || undefined

  const data = await redemptionService.listRedemptions({
    codeId,
    userId,
    batchId,
    startAt: parseDate(query.startAt),
    endAt: parseDate(query.endAt),
    limit: query.limit ? Number(query.limit) : undefined,
    offset: query.offset ? Number(query.offset) : undefined
  })

  return data
})

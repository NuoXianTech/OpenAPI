import type { H3Event } from 'h3'
import type { RedemptionStatus } from '~~/server/services/redemption-service'
import { redemptionService } from '~~/server/services/redemption-service'
import { requireAdmin } from '~~/server/utils/auth'
import { readPaginationQuery } from '~~/server/utils/request-pagination'

const VALID_STATUS: Array<RedemptionStatus | 'all'> = ['all', 'enabled', 'disabled', 'used_up', 'expired', 'available']

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  const { query, limit, offset } = readPaginationQuery(event)

  const batchId = (query.batchId || '').toString().trim() || undefined
  const keyword = (query.keyword || '').toString().trim() || undefined
  const statusRaw = (query.status || 'all').toString()
  const status = (VALID_STATUS as string[]).includes(statusRaw)
    ? (statusRaw as RedemptionStatus | 'all')
    : 'all'

  const data = await redemptionService.list({
    batchId,
    status: status === 'all' ? undefined : status,
    keyword,
    limit,
    offset
  })
  return data
})

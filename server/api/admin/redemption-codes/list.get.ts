import type { H3Event } from 'h3'
import { getQuery } from 'h3'
import type { RedemptionStatus } from '~~/server/service/redemptionService'
import { redemptionService } from '~~/server/service/redemptionService'
import { requireAdmin } from '~~/server/utils/auth'

const VALID_STATUS: Array<RedemptionStatus | 'all'> = ['all', 'enabled', 'disabled', 'used_up', 'expired', 'available']

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  const query = getQuery(event)

  const batchId = (query.batchId || '').toString().trim() || undefined
  const keyword = (query.keyword || '').toString().trim() || undefined
  const statusRaw = (query.status || 'all').toString()
  const status = (VALID_STATUS as string[]).includes(statusRaw)
    ? (statusRaw as RedemptionStatus | 'all')
    : 'all'
  const limit = query.limit ? Number(query.limit) : 50
  const offset = query.offset ? Number(query.offset) : 0

  const data = await redemptionService.list({
    batchId,
    status: status === 'all' ? undefined : status,
    keyword,
    limit,
    offset,
  })
  return { code: 0, msg: 'ok', data }
})

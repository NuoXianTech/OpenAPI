import type { RedemptionStatus } from '~~/server/services/redemption-service'
import { redemptionService } from '~~/server/services/redemption-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readPaginationQuery } from '~~/server/utils/pagination'
import { readQueryOption, readQueryText } from '~~/server/utils/request-query'

const VALID_STATUS: Array<RedemptionStatus | 'all'> = ['all', 'enabled', 'disabled', 'used_up', 'expired', 'available']

export default defineAdminEventHandler(async (event) => {
  const { query, limit, offset } = readPaginationQuery(event, { defaultLimit: 20 })

  const batchId = readQueryText(query.batchId)
  const keyword = readQueryText(query.keyword)
  const status = readQueryOption(query.status, VALID_STATUS) ?? 'all'

  const data = await redemptionService.list({
    batchId,
    status: status === 'all' ? undefined : status,
    keyword,
    limit,
    offset
  })
  return data
})

import { platformUpstreamService } from '~~/server/services/platform-upstream-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readPaginationQuery } from '~~/server/utils/pagination'
import { toPlatformUpstream } from '~~/server/utils/platform-view'

export default defineAdminEventHandler(async (event) => {
  const { limit, offset } = readPaginationQuery(event, { defaultLimit: 20 })
  const result = await platformUpstreamService.listPage({
    checkAvailability: true,
    limit,
    offset
  })
  return {
    items: result.items.map(toPlatformUpstream),
    total: result.total
  }
})

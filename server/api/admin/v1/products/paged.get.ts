import { platformProductService } from '~~/server/services/platform-product-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readPaginationQuery } from '~~/server/utils/pagination'
import { toPlatformProduct } from '~~/server/utils/platform-view'

export default defineAdminEventHandler(async (event) => {
  const { limit, offset } = readPaginationQuery(event, { defaultLimit: 20 })
  const result = await platformProductService.listPage({ limit, offset })
  return {
    items: result.items.map(toPlatformProduct),
    total: result.total
  }
})

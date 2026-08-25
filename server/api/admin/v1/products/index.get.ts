import { platformProductService } from '~~/server/services/platform-product-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { toPlatformProduct } from '~~/server/utils/platform-view'

export default defineAdminEventHandler(async () => (
  (await platformProductService.list()).map(toPlatformProduct)
))

import { platformEndpointCatalogService } from '~~/server/services/platform-endpoint-catalog-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { toPlatformEndpointCatalog } from '~~/server/utils/platform-view'

export default defineAdminEventHandler(async () => (
  toPlatformEndpointCatalog(await platformEndpointCatalogService.list())
))

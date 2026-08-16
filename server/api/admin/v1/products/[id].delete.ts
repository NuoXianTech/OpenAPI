import { platformProductService } from '~~/server/services/platform-product-service'
import { routingRevisionService } from '~~/server/services/routing-revision-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { readUuidRouterParam } from '~~/server/utils/router-param'
import { defineAdminEventHandler } from '~~/server/utils/auth'

export default defineAdminEventHandler(async (event, admin) => {
  const id = readUuidRouterParam(event)
  const removed = await platformProductService.remove(id)
  await routingRevisionService.publishWorkspace(removed.workspaceId, admin.id)
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.platform.product.delete',
    resourceType: 'api-product',
    resourceId: id,
    detail: { slug: removed.slug }
  })
  return { id }
})

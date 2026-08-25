import { platformProductService } from '~~/server/services/platform-product-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { readUuidRouterParam } from '~~/server/utils/router-param'
import { defineAdminEventHandler } from '~~/server/utils/auth'

export default defineAdminEventHandler(async (event, admin) => {
  const id = readUuidRouterParam(event)
  const result = await platformProductService.removeAndPublish(id, admin.id)
  const removed = result.product
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.platform.product.delete',
    resourceType: 'api-product',
    resourceId: id,
    detail: { slug: removed.slug }
  })
  return {
    id,
    revision: result.revision
  }
})

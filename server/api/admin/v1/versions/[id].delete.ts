import { platformProductService } from '~~/server/services/platform-product-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { readUuidRouterParam } from '~~/server/utils/router-param'
import { defineAdminEventHandler } from '~~/server/utils/auth'

export default defineAdminEventHandler(async (event, admin) => {
  const id = readUuidRouterParam(event)
  const result = await platformProductService.removeVersionAndPublish(id, admin.id)
  const removed = result.version
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.platform.version.delete',
    resourceType: 'api-version',
    resourceId: id,
    detail: { version: removed.version }
  })
  return {
    id,
    revision: result.revision
  }
})

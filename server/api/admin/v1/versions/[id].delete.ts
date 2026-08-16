import { platformProductService } from '~~/server/services/platform-product-service'
import { routingRevisionService } from '~~/server/services/routing-revision-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { readUuidRouterParam } from '~~/server/utils/router-param'
import { defineAdminEventHandler } from '~~/server/utils/auth'

export default defineAdminEventHandler(async (event, admin) => {
  const id = readUuidRouterParam(event)
  const removed = await platformProductService.removeVersion(id)
  await routingRevisionService.publishWorkspace(removed.workspaceId, admin.id)
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.platform.version.delete',
    resourceType: 'api-version',
    resourceId: id,
    detail: { version: removed.version.version }
  })
  return { id }
})

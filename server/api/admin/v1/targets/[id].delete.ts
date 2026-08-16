import { platformUpstreamService } from '~~/server/services/platform-upstream-service'
import { routingRevisionService } from '~~/server/services/routing-revision-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { readUuidRouterParam } from '~~/server/utils/router-param'
import { defineAdminEventHandler } from '~~/server/utils/auth'

export default defineAdminEventHandler(async (event, admin) => {
  const id = readUuidRouterParam(event)
  const removed = await platformUpstreamService.removeTarget(id)
  await routingRevisionService.publishWorkspace(removed.workspaceId, admin.id)
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.platform.target.delete',
    resourceType: 'upstream-target',
    resourceId: id,
    detail: { baseUrl: removed.target.baseUrl }
  })
  return { id }
})

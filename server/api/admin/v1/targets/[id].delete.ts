import { platformUpstreamService } from '~~/server/services/platform-upstream-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { readUuidRouterParam } from '~~/server/utils/router-param'
import { defineAdminEventHandler } from '~~/server/utils/auth'

export default defineAdminEventHandler(async (event, admin) => {
  const id = readUuidRouterParam(event)
  const result = await platformUpstreamService.removeTargetAndPublish(id, admin.id)
  const removed = result.target
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.platform.target.delete',
    resourceType: 'upstream-target',
    resourceId: id,
    detail: { baseUrl: removed.baseUrl }
  })
  return {
    id,
    revision: result.revision
  }
})

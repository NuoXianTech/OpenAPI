import { platformUpstreamService } from '~~/server/services/platform-upstream-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { readUuidRouterParam } from '~~/server/utils/router-param'
import { defineAdminEventHandler } from '~~/server/utils/auth'

export default defineAdminEventHandler(async (event, admin) => {
  const id = readUuidRouterParam(event)
  const result = await platformUpstreamService.removeAndPublish(id, admin.id)
  const removed = result.upstream
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.platform.upstream.delete',
    resourceType: 'upstream-service',
    resourceId: id,
    detail: { slug: removed.slug }
  })
  return {
    id,
    revisions: result.revisions
  }
})

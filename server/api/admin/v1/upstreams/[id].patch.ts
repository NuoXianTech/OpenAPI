import { adminUpdateUpstreamSchema } from '~~/server/schemas/admin'
import { platformUpstreamService } from '~~/server/services/platform-upstream-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { readUuidRouterParam } from '~~/server/utils/router-param'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'
import { toPlatformUpstreamSummary } from '~~/server/utils/platform-view'

export default defineAdminEventHandler(async (event, admin) => {
  const id = readUuidRouterParam(event)
  const body = await readZodBody(event, adminUpdateUpstreamSchema)
  const result = await platformUpstreamService.updateAndPublish(id, body, admin.id)
  const updated = result.upstream
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.platform.upstream.update',
    resourceType: 'upstream-service',
    resourceId: id,
    detail: { patch: body }
  })
  return {
    ...toPlatformUpstreamSummary(updated),
    revisions: result.revisions
  }
})

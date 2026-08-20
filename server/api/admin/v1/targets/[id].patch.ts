import { adminUpdateTargetSchema } from '~~/server/schemas/admin'
import { platformUpstreamService } from '~~/server/services/platform-upstream-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { readUuidRouterParam } from '~~/server/utils/router-param'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'
import { toPlatformUpstreamTarget } from '~~/server/utils/platform-view'

export default defineAdminEventHandler(async (event, admin) => {
  const id = readUuidRouterParam(event)
  const body = await readZodBody(event, adminUpdateTargetSchema)
  const result = await platformUpstreamService.updateTargetAndPublish(
    id,
    body,
    admin.id
  )
  const updated = result.target
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.platform.target.update',
    resourceType: 'upstream-target',
    resourceId: id,
    detail: { patch: body }
  })
  return {
    ...toPlatformUpstreamTarget(updated),
    revisions: result.revisions
  }
})

import { adminCreateTargetSchema } from '~~/server/schemas/admin'
import { platformUpstreamService } from '~~/server/services/platform-upstream-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { readUuidRouterParam } from '~~/server/utils/router-param'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'
import { toPlatformUpstreamTarget } from '~~/server/utils/platform-view'

export default defineAdminEventHandler(async (event, admin) => {
  const upstreamId = readUuidRouterParam(event)
  const body = await readZodBody(event, adminCreateTargetSchema)
  const result = await platformUpstreamService.createTargetAndPublish(
    upstreamId,
    body,
    admin.id
  )
  const created = result.target
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.platform.target.create',
    resourceType: 'upstream-target',
    resourceId: created.id,
    detail: { upstreamId, baseUrl: created.baseUrl }
  })
  return {
    ...toPlatformUpstreamTarget(created),
    revisions: result.revisions
  }
})

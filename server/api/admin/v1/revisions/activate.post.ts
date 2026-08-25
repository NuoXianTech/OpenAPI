import { adminActivateRevisionSchema } from '~~/server/schemas/admin'
import { routingRevisionService } from '~~/server/services/routing-revision-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'
import { toPlatformRoutingRevision } from '~~/server/utils/platform-view'

export default defineAdminEventHandler(async (event, admin) => {
  const body = await readZodBody(event, adminActivateRevisionSchema)
  const revision = await routingRevisionService.activate(body.revisionId)
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.platform.revision.activate',
    resourceType: 'routing-revision',
    resourceId: revision.id,
    detail: { sequence: revision.sequence }
  })
  return toPlatformRoutingRevision(revision)
})

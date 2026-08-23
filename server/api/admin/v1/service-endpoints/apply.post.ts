import { adminApplyServiceEndpointChangesSchema } from '~~/server/schemas/admin'
import { applyEnvironmentRevision } from '~~/server/services/platform-endpoint-publication-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'
import { toPlatformRoutingRevision } from '~~/server/utils/platform-view'

export default defineAdminEventHandler(async (event, admin) => {
  const body = await readZodBody(
    event,
    adminApplyServiceEndpointChangesSchema
  )
  const revision = await applyEnvironmentRevision(body.environmentId, admin.id)
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.platform.endpoint.apply',
    resourceType: 'routing-revision',
    resourceId: revision.id,
    detail: {
      environmentId: revision.environmentId,
      revisionSequence: revision.sequence
    }
  })
  return { revision: toPlatformRoutingRevision(revision) }
})

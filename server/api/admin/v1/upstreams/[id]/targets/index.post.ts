import { setResponseStatus } from 'h3'
import { adminCreateTargetSchema } from '~~/server/schemas/admin'
import { applyWorkspaceRevision } from '~~/server/services/platform-endpoint-publication-service'
import { platformUpstreamService } from '~~/server/services/platform-upstream-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { readUuidRouterParam } from '~~/server/utils/router-param'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
  const upstreamId = readUuidRouterParam(event)
  const body = await readZodBody(event, adminCreateTargetSchema)
  const created = await platformUpstreamService.createTarget(upstreamId, body)
  const publication = created.publishRouting
    ? await applyWorkspaceRevision(created.workspaceId, admin.id)
    : { applied: true as const, revisions: [], publicationError: null }
  if (!publication.applied) setResponseStatus(event, 202)
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.platform.target.create',
    resourceType: 'upstream-target',
    resourceId: created.target.id,
    detail: { upstreamId, baseUrl: created.target.baseUrl, applied: publication.applied, publicationError: publication.publicationError }
  })
  return { ...created.target, ...publication }
})

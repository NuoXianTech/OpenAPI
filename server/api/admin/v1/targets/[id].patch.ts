import { setResponseStatus } from 'h3'
import { adminUpdateTargetSchema } from '~~/server/schemas/admin'
import { applyWorkspaceRevision } from '~~/server/services/platform-endpoint-publication-service'
import { platformUpstreamService } from '~~/server/services/platform-upstream-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { readUuidRouterParam } from '~~/server/utils/router-param'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
  const id = readUuidRouterParam(event)
  const body = await readZodBody(event, adminUpdateTargetSchema)
  const updated = await platformUpstreamService.updateTarget(id, body)
  const publication = updated.publishRouting
    ? await applyWorkspaceRevision(updated.workspaceId, admin.id)
    : { applied: true as const, revisions: [], publicationError: null }
  if (!publication.applied) setResponseStatus(event, 202)
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.platform.target.update',
    resourceType: 'upstream-target',
    resourceId: id,
    detail: { patch: body, applied: publication.applied, publicationError: publication.publicationError }
  })
  return { ...updated.target, ...publication }
})

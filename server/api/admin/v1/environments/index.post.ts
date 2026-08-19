import { setResponseStatus } from 'h3'
import { adminCreateEnvironmentSchema } from '~~/server/schemas/admin'
import { applyWorkspaceRevision } from '~~/server/services/platform-endpoint-publication-service'
import { platformWorkspaceService } from '~~/server/services/platform-workspace-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
  const body = await readZodBody(event, adminCreateEnvironmentSchema)
  const created = await platformWorkspaceService.createEnvironment(body)
  const publication = await applyWorkspaceRevision(created.workspaceId, admin.id)
  if (!publication.applied) setResponseStatus(event, 202)
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.platform.environment.create',
    resourceType: 'environment',
    resourceId: created.id,
    detail: { workspaceId: created.workspaceId, slug: created.slug, applied: publication.applied, publicationError: publication.publicationError }
  })
  return { ...created, ...publication }
})

import { platformWorkspaceService } from '~~/server/services/platform-workspace-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { toPlatformWorkspace } from '~~/server/utils/platform-view'

export default defineAdminEventHandler(async () => (
  (await platformWorkspaceService.list()).map(toPlatformWorkspace)
))

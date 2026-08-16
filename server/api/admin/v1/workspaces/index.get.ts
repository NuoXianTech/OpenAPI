import { platformWorkspaceService } from '~~/server/services/platform-workspace-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'

export default defineAdminEventHandler(() => platformWorkspaceService.list())

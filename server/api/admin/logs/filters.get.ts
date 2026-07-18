import { adminLogsService } from '~~/server/services/admin-logs-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'

export default defineAdminEventHandler(() => adminLogsService.listFilterOptions())

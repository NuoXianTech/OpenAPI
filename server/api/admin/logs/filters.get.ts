import { adminApiCallLogService } from '~~/server/services/admin-api-call-log-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'

export default defineAdminEventHandler(() => adminApiCallLogService.listFilterOptions())

import { adminDashboardService } from '~~/server/services/admin-dashboard-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'

export default defineAdminEventHandler(() => adminDashboardService.getInsights())

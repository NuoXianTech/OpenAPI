import { adminCreditReportService } from '~~/server/services/admin-credit-report-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'

export default defineAdminEventHandler(() => {
  return adminCreditReportService.getOverview()
})

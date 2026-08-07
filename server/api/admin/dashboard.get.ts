import { getQuery } from 'h3'
import { adminDashboardService } from '~~/server/services/admin-dashboard-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readQueryNumber } from '~~/server/utils/request-query'

export default defineAdminEventHandler((event) => {
  const query = getQuery(event)
  return adminDashboardService.getDashboard({
    days: readQueryNumber(query.days),
    distributionLimit: readQueryNumber(query.top),
    recentLimit: readQueryNumber(query.recent)
  })
})

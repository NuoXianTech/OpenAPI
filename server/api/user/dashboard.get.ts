import { setResponseHeader } from 'h3'
import { userDashboardService } from '~~/server/services/user-dashboard-service'
import { defineAuthenticatedEventHandler } from '~~/server/utils/auth'

export default defineAuthenticatedEventHandler((event, user) => {
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  return userDashboardService.getDashboard(user.id)
})

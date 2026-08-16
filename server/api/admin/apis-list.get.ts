import { apiScopeService } from '~~/server/services/api-scope-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'

export default defineAdminEventHandler(async () => {
  return apiScopeService.listPublishedProductScopes()
})

import { apiScopeService } from '~~/server/services/api-scope-service'
import { defineAuthenticatedEventHandler } from '~~/server/utils/auth'

export default defineAuthenticatedEventHandler(async () => {
  return apiScopeService.listPublishedProductScopes()
})

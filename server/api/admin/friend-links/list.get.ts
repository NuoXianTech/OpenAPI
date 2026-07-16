import { friendLinkService } from '~~/server/services/friend-link-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'

export default defineAdminEventHandler(() => {
  return friendLinkService.list()
})

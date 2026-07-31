import { usersService } from '~~/server/services/user-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'

export default defineAdminEventHandler(() => usersService.listNotificationRecipients())

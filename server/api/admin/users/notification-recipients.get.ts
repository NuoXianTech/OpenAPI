import { adminUserService } from '~~/server/services/admin-user-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'

export default defineAdminEventHandler(() => adminUserService.listNotificationRecipients())

import { redemptionService } from '~~/server/services/redemption-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'

export default defineAdminEventHandler(() => redemptionService.listBatches())

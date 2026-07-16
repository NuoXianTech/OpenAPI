import { getQuery } from 'h3'
import { oauthAccountService } from '~~/server/services/oauth-account-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readRequiredQueryNumber } from '~~/server/utils/request-query'

export default defineAdminEventHandler((event) => {
  const userId = readRequiredQueryNumber(getQuery(event), 'userId')

  return oauthAccountService.listSafeByUserId(userId)
})

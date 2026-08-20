import { USER_ROLES } from '~~/server/services/user-service'
import { adminUserService } from '~~/server/services/admin-user-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readPaginationQuery } from '~~/server/utils/pagination'
import { readQueryNumber, readQueryOption, readQueryString } from '~~/server/utils/request-query'

const USER_ROLE_OPTIONS = Object.values(USER_ROLES)
const BOOLEAN_FILTER_OPTIONS = ['true', 'false'] as const
const CREDIT_BALANCE_FILTER_OPTIONS = ['positive', 'zero'] as const

function readBooleanFilter(value: unknown): boolean | undefined {
  const option = readQueryOption(value, BOOLEAN_FILTER_OPTIONS)
  if (option === undefined) return undefined
  return option === 'true'
}

function readUserIdFilter(value: unknown): number | undefined {
  const userId = readQueryNumber(value)
  return userId !== undefined && Number.isInteger(userId) && userId > 0 ? userId : undefined
}

export default defineAdminEventHandler((event) => {
  const { query, limit, offset } = readPaginationQuery(event, { defaultLimit: 20 })

  return adminUserService.list({
    keyword: readQueryString(query.keyword),
    userId: readUserIdFilter(query.userId),
    role: readQueryOption(query.role, USER_ROLE_OPTIONS),
    isActive: readBooleanFilter(query.isActive),
    isBanned: readBooleanFilter(query.isBanned),
    creditBalance: readQueryOption(query.creditBalance, CREDIT_BALANCE_FILTER_OPTIONS),
    limit,
    offset
  })
})

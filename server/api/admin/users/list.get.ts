import type { H3Event } from 'h3'
import { getQuery } from 'h3'
import { USER_ROLES, usersService } from '~~/server/services/user-service'
import { requireAdmin } from '~~/server/utils/auth'
import { readQueryNumber, readQueryOption, readQueryString } from '~~/server/utils/request-query'

const USER_ROLE_OPTIONS = Object.values(USER_ROLES)
const BOOLEAN_FILTER_OPTIONS = ['true', 'false'] as const

function readBooleanFilter(value: unknown): boolean | undefined {
  const option = readQueryOption(value, BOOLEAN_FILTER_OPTIONS)
  if (option === undefined) return undefined
  return option === 'true'
}

function readUserIdFilter(value: unknown): number | undefined {
  const userId = readQueryNumber(value)
  return userId !== undefined && Number.isInteger(userId) && userId > 0 ? userId : undefined
}

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  const query = getQuery(event)

  return usersService.list({
    keyword: readQueryString(query.keyword),
    userId: readUserIdFilter(query.userId),
    role: readQueryOption(query.role, USER_ROLE_OPTIONS),
    isActive: readBooleanFilter(query.isActive),
    isBanned: readBooleanFilter(query.isBanned)
  })
})

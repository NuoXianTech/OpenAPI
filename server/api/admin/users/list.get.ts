import type { H3Event } from 'h3'
import { getQuery } from 'h3'
import { usersService } from '~~/server/service/userService'
import { requireAdmin } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  const query = getQuery(event)
  const users = await usersService.list()
  const keyword = (query.keyword || '').toString().trim().toLowerCase()

  const filtered = users.filter((user) => {
    const matchesKeyword = !keyword
      || [user.username, user.email, user.displayName].some(value => (value || '').toString().toLowerCase().includes(keyword))
    return matchesKeyword
  })

  return filtered
})

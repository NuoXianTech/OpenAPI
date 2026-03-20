import type { H3Event } from 'h3'
import { getQuery } from 'h3'
import { usersService } from '~~/server/service/userService'
import { requireAdmin } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  const query = getQuery(event)
  const users = await usersService.list()
  const keyword = (query.keyword || '').toString().trim().toLowerCase()
  const role = (query.role || '').toString().trim()

  const filtered = users.filter((user) => {
    const matchesKeyword = !keyword
      || [user.username, user.email, user.displayName, user.role].some(value => (value || '').toString().toLowerCase().includes(keyword))
    const matchesRole = !role || user.role === role
    return matchesKeyword && matchesRole
  })

  return {
    code: 0,
    msg: 'ok',
    data: filtered,
  }
})

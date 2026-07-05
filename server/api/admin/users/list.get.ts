import type { H3Event } from 'h3'
import { getQuery } from 'h3'
import { usersService } from '~~/server/services/user-service'
import { requireAdmin } from '~~/server/utils/auth'
import { readQueryString } from '~~/server/utils/request-query'

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  const { keyword } = getQuery(event)
  // keyword 过滤已下推到 SQL（见 usersService.list），不再全量拉取后在内存 filter
  return usersService.list({ keyword: readQueryString(keyword) })
})

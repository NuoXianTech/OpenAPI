import type { H3Event } from 'h3'
import { getAuthUser } from '~~/server/utils/auth'
import { creditService } from '~~/server/service/creditService'

export default defineEventHandler(async (event: H3Event) => {
  const user = await getAuthUser(event)
  if (!user) {
    return null
  }

  // 普通用户附带余额，admin 不需要。getBalance 失败时降级为 0，避免阻塞登录态
  let credits = 0
  if (user.kind === 'user' && user.id) {
    try {
      credits = await creditService.getBalance(user.id)
    }
    catch (err) {
      console.error('failed to load user credits in /api/auth/me', { userId: user.id, err })
    }
  }

  return { ...user, credits }
})

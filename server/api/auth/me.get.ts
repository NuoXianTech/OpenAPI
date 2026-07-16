import { setResponseHeader } from 'h3'
import { getAuthUser } from '~~/server/utils/auth'
import { creditService } from '~~/server/services/credit-service'

export default defineEventHandler(async (event) => {
  // 登录态是按 cookie 维度的私有响应：禁止任何下游 CDN / 反向代理 / Service Worker 缓存，
  // 避免在 SSR 或多用户共享代理场景下把 A 用户的 user payload 串给 B 用户。
  setResponseHeader(event, 'Cache-Control', 'private, no-store')

  const user = await getAuthUser(event)
  if (!user) {
    return null
  }

  // 用户附带积分，admin 不需要。getBalance 失败时降级为 0，避免阻塞登录态
  let credits = 0
  if (user.role === 'user' && user.id) {
    try {
      credits = await creditService.getBalance(user.id)
    } catch (err) {
      console.error('failed to load user credits in /api/auth/me', { userId: user.id, err })
    }
  }

  return { ...user, credits }
})

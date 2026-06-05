import { ADMIN_OVERVIEW_PATH } from '~/constants/admin-sections/overview'

export default defineNuxtRouteMiddleware(async () => {
  const { fetchMe, user } = useAuth()
  // SSR 阶段 auth plugin 已 await fetchMe() 把登录态写入 event.context，这里直接读 user 即可，
  // 避免每个受保护路由 SSR 都重复打一次 /api/auth/me；客户端导航仍需重新评估（plugin 客户端不 await）。
  if (import.meta.client) await fetchMe()

  if (user.value?.kind === 'user') return
  if (user.value?.kind === 'admin') return navigateTo(ADMIN_OVERVIEW_PATH)
  return navigateTo('/login')
})

export default defineNuxtPlugin(async () => {
  // 客户端 hydrate 后拉一次登录态写进 useState：公共页（无鉴权中间件）首次进入时初始化登录态；
  // admin/user 走 SSR 时中间件里已经 fetchMe 过并 hydrate 进 useState，这里会命中 TTL 短路不会重复请求。
  const { fetchMe } = useAuth()
  await fetchMe()

  // 长会话场景下，定时和切回标签时重拉一次 /api/auth/me，
  // 用来感知后端封禁、踢人、session 失效；fetchMe 内部有 TTL 短路，重复触发不会打满请求。
  const REVALIDATE_INTERVAL_MS = 5 * 60 * 1000

  setInterval(() => {
    if (document.visibilityState === 'visible') {
      fetchMe(true).catch(() => {})
    }
  }, REVALIDATE_INTERVAL_MS)

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      fetchMe().catch(() => {})
    }
  })
})

export default defineNuxtPlugin(async () => {
  // 客户端启动时（hydrate 后）拉一次登录态写进 useState；
  // 之后所有页面/组件用 useAuth().user 读取，不再重复请求 /api/auth/me。
  // 仅客户端：避免 SWR/payload 缓存把登录态泄露给其他用户。
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

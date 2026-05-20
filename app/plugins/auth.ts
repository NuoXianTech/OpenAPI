export default defineNuxtPlugin(async (nuxtApp) => {
  // SSR + 客户端都拉一次 /api/auth/me：SSR 阶段把 user 写进 nuxt payload，避免 AppHeader 等公共组件
  // 在 hydrate 之后出现"未登录 → 已登录"的闪烁；客户端 hydrate 后再跑一次校准 TTL 起点
  // （HTML 可能来自浏览器缓存，SSR 时间戳不可信）。fetchMe 内部已分端处理 cookie 转发与 dedup。
  const { fetchMe } = useAuth()
  await fetchMe()

  if (import.meta.server) return

  // 客户端独占：长会话定时和切回标签时重拉一次 /api/auth/me，
  // 用来感知后端封禁、踢人、session 失效；fetchMe 内部有 TTL 短路，重复触发不会打满请求。
  const REVALIDATE_INTERVAL_MS = 5 * 60 * 1000

  // 用 effectScope 持有 timer / listener，HMR 重跑或 app:unmount 时一并 stop，
  // 避免 dev 热更后旧 plugin 实例继续触发 fetchMe。
  const SCOPE_KEY = Symbol.for('auth.client.scope')
  const g = globalThis as typeof globalThis & { [SCOPE_KEY]?: ReturnType<typeof effectScope> }
  g[SCOPE_KEY]?.stop()

  const scope = effectScope(true)
  scope.run(() => {
    useIntervalFn(() => {
      if (document.visibilityState === 'visible') {
        fetchMe(true).catch(() => {})
      }
    }, REVALIDATE_INTERVAL_MS)

    useEventListener(document, 'visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        fetchMe().catch(() => {})
      }
    })
  })
  g[SCOPE_KEY] = scope

  nuxtApp.hook('app:unmount', () => {
    scope.stop()
    if (g[SCOPE_KEY] === scope) g[SCOPE_KEY] = undefined
  })
})

export default defineNuxtPlugin(async (nuxtApp) => {
  // SSR：拉一次 /api/auth/me 写到 event.context（不进 payload），让 SSR 阶段的 middleware /
  // route guard 能拿到登录态做重定向，但不会把 user 序列化下发给浏览器。
  // 客户端：app:mounted 后再拉一次，把 user 写进 useState 驱动 UI。
  // 不在客户端 plugin 阶段 await，是为了不阻塞首屏 hydrate；依赖 user 的 UI 需要用 <ClientOnly>
  // + fallback 渲染未登录占位，待 fetchMe 完成后自然切到登录态。
  const { fetchMe } = useAuth()

  if (import.meta.server) {
    await fetchMe()
    return
  }

  nuxtApp.hook('app:mounted', () => {
    fetchMe().catch(() => {})
  })

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
})

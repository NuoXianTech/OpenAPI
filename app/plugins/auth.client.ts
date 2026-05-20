export default defineNuxtPlugin(async (nuxtApp) => {
  // 客户端 hydrate 后必拉一次 /api/auth/me：SSR 拿到的 user 通过 useState 已 hydrate，但 fetchedAt
  // 不跨端共享（HTML 可能来自浏览器缓存，SSR 时间戳不可信），这里重新拉一次校准客户端 TTL 起点。
  const { fetchMe } = useAuth()
  await fetchMe()

  // 长会话场景下，定时和切回标签时重拉一次 /api/auth/me，
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

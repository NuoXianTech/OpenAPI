export default defineNuxtPlugin((nuxtApp) => {
  const { fetchMe } = useAuth()

  // Hydration is never blocked on authentication. Protected pages perform
  // their own server/client check in auth-dashboard middleware.
  nuxtApp.hook('app:mounted', () => {
    fetchMe().catch(() => {})
  })

  const REVALIDATE_INTERVAL_MS = 5 * 60 * 1000
  const SCOPE_KEY = Symbol.for('auth.client.scope')
  const globalScope = globalThis as typeof globalThis & {
    [SCOPE_KEY]?: ReturnType<typeof effectScope>
  }
  globalScope[SCOPE_KEY]?.stop()

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
  globalScope[SCOPE_KEY] = scope
})

export default defineNuxtRouteMiddleware(async () => {
  const { ensureAdmin } = useAuth()
  const ok = await ensureAdmin()
  if (!ok) {
    return navigateTo('/login')
  }
})

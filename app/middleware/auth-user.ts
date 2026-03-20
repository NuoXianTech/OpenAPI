export default defineNuxtRouteMiddleware(async () => {
  const { fetchMe, user } = useAuth()
  if (!user.value) {
    await fetchMe()
  }

  if (!user.value || user.value.role !== 'user') {
    return navigateTo('/login')
  }
})

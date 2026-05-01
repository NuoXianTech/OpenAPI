export default defineNuxtRouteMiddleware(async () => {
  const { fetchMe, user } = useAuth()
  await fetchMe()

  if (!user.value || user.value.kind !== 'user') {
    return navigateTo('/login')
  }
})

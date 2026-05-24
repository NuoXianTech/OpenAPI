import { ADMIN_OVERVIEW_PATH } from '~/constants/admin-sections/overview'

export default defineNuxtRouteMiddleware(async () => {
  const { fetchMe, user } = useAuth()
  await fetchMe()

  if (user.value?.kind === 'user') return
  if (user.value?.kind === 'admin') return navigateTo(ADMIN_OVERVIEW_PATH)
  return navigateTo('/login')
})

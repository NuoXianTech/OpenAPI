import { USER_OVERVIEW_PATH } from '~/constants/user-sections/overview'

export default defineNuxtRouteMiddleware(async () => {
  const { fetchMe, user } = useAuth()
  await fetchMe()

  if (user.value?.kind === 'admin') return
  if (user.value?.kind === 'user') return navigateTo(USER_OVERVIEW_PATH)
  return navigateTo('/admin/login')
})

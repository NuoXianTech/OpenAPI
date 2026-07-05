import { ADMIN_OVERVIEW_PATH } from '~/constants/admin-sections/overview'
import { USER_OVERVIEW_PATH } from '~/constants/user-sections/overview'

export default defineNuxtRouteMiddleware((to) => {
  if (to.path === '/admin' || to.path === '/admin/') {
    return navigateTo(ADMIN_OVERVIEW_PATH, { replace: true })
  }

  if (to.path === '/user' || to.path === '/user/') {
    return navigateTo(USER_OVERVIEW_PATH, { replace: true })
  }
})

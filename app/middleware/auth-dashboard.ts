import { ADMIN_OVERVIEW_PATH, USER_OVERVIEW_PATH } from '~/constants/dashboard-sections'

interface DashboardAuthRoute {
  basePath: string
  kind: 'admin' | 'user'
  loginPath: string
  overviewPath: string
  roleMismatchRedirectPath: string
}

const dashboardAuthRoutes: DashboardAuthRoute[] = [
  {
    basePath: '/admin',
    kind: 'admin',
    loginPath: '/admin/login',
    overviewPath: ADMIN_OVERVIEW_PATH,
    roleMismatchRedirectPath: USER_OVERVIEW_PATH
  },
  {
    basePath: '/user',
    kind: 'user',
    loginPath: '/login',
    overviewPath: USER_OVERVIEW_PATH,
    roleMismatchRedirectPath: ADMIN_OVERVIEW_PATH
  }
]

export default defineNuxtRouteMiddleware(async function authDashboardMiddleware(to) {
  const route = dashboardAuthRoutes.find(function matchesDashboardRoute(item) {
    return isInDashboardRoute(to.path, item.basePath)
  })
  if (!route) return

  const { fetchMe, user } = useAuth()
  if (import.meta.client) await fetchMe()

  if (user.value?.kind === route.kind) {
    return isDashboardRoot(to.path, route.basePath)
      ? navigateTo(route.overviewPath, { replace: true })
      : undefined
  }

  if (user.value?.kind) return navigateTo(route.roleMismatchRedirectPath)
  return navigateTo(route.loginPath)
})

function isInDashboardRoute(path: string, basePath: string): boolean {
  return path === basePath || path === `${basePath}/` || path.startsWith(`${basePath}/`)
}

function isDashboardRoot(path: string, basePath: string): boolean {
  return path === basePath || path === `${basePath}/`
}

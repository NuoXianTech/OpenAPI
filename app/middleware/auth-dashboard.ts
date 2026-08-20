import { ADMIN_OVERVIEW_PATH, USER_OVERVIEW_PATH } from '~/constants/dashboard-config'

interface DashboardAuthRoute {
  basePath: string
  role: 'admin' | 'user'
  loginPath: string
  overviewPath: string
  roleMismatchRedirectPath: string
}

const dashboardAuthRoutes: DashboardAuthRoute[] = [
  {
    basePath: '/admin',
    role: 'admin',
    loginPath: '/login',
    overviewPath: ADMIN_OVERVIEW_PATH,
    roleMismatchRedirectPath: USER_OVERVIEW_PATH
  },
  {
    basePath: '/user',
    role: 'user',
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
  await fetchMe()

  if (user.value?.role && canAccessDashboardRoute(user.value.role, route.role)) {
    return isDashboardRoot(to.path, route.basePath)
      ? navigateTo(route.overviewPath, { replace: true })
      : undefined
  }

  if (user.value?.role) return navigateTo(route.roleMismatchRedirectPath)
  return navigateTo(route.loginPath)
})

function isInDashboardRoute(path: string, basePath: string): boolean {
  return path === basePath || path === `${basePath}/` || path.startsWith(`${basePath}/`)
}

function isDashboardRoot(path: string, basePath: string): boolean {
  return path === basePath || path === `${basePath}/`
}

function canAccessDashboardRoute(userRole: DashboardAuthRoute['role'], routeRole: DashboardAuthRoute['role']): boolean {
  return userRole === routeRole || (userRole === 'admin' && routeRole === 'user')
}

import { and, eq, inArray, isNull } from 'drizzle-orm'
import { apiProducts, apiRoutes, apiVersions, upstreamServices } from '~~/server/db/schema'

export const publicApiProductCondition = and(
  eq(apiProducts.visibility, 'public'),
  inArray(apiProducts.lifecycle, ['active', 'deprecated']),
  inArray(apiVersions.state, ['published', 'deprecated']),
  eq(upstreamServices.status, 'active'),
  isNull(apiProducts.deletedAt),
  isNull(apiRoutes.deletedAt),
  isNull(upstreamServices.deletedAt)
)!

export const publicApiRouteCondition = and(
  publicApiProductCondition,
  eq(apiRoutes.state, 'active')
)!

export const publicTrackedApiRouteCondition = and(
  publicApiRouteCondition,
  eq(apiRoutes.isStatistics, true)
)!

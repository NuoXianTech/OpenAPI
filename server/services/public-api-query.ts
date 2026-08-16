import { and, eq, inArray, isNull, sql } from 'drizzle-orm'
import {
  apiProducts,
  apiRoutes,
  apiVersions,
  environments,
  routingRevisions,
  upstreamServices
} from '~~/server/db/schema'

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
  eq(apiRoutes.state, 'active'),
  sql<boolean>`exists (
    select 1
    from ${environments}
    inner join ${routingRevisions}
      on ${routingRevisions.id} = ${environments.activeRevisionId}
    cross join lateral jsonb_array_elements(
      ${routingRevisions.configPayload}->'routes'
    ) as live_route
    where ${environments.status} = 'active'
      and ${routingRevisions.status} = 'published'
      and live_route->>'id' = ${apiRoutes.id}::text
  )`
)!

export const publicTrackedApiRouteCondition = and(
  publicApiRouteCondition,
  eq(apiRoutes.isStatistics, true)
)!

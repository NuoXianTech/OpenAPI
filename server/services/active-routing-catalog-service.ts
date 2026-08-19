import { desc, eq, inArray } from 'drizzle-orm'
import { db } from '~~/server/db/client'
import {
  apiProducts,
  environments,
  routingRevisions
} from '~~/server/db/schema'
import type { RoutingRevisionRoute } from '~~/server/types/routing-revision'

export interface ActiveCatalogRoute {
  route: RoutingRevisionRoute
  product: typeof apiProducts.$inferSelect
  environmentId: string
  revisionId: string
  publishedAt: Date
}

/**
 * Returns the route configuration that is actually serving traffic.
 *
 * Route behavior comes exclusively from active immutable revisions. Product
 * copy and category metadata stay editable and are joined by stable product id.
 * A route deployed to multiple environments is represented by the newest
 * active publication. The public catalog groups the resulting routes by
 * product after this environment-level deduplication.
 */
async function listActiveCatalogRoutes(): Promise<ActiveCatalogRoute[]> {
  const revisionRows = await db.select({
    environmentId: environments.id,
    revisionId: routingRevisions.id,
    publishedAt: routingRevisions.publishedAt,
    payload: routingRevisions.configPayload
  }).from(environments)
    .innerJoin(routingRevisions, eq(routingRevisions.id, environments.activeRevisionId))
    .where(eq(environments.status, 'active'))
    .orderBy(desc(routingRevisions.publishedAt), desc(routingRevisions.createdAt))

  const activeByRouteId = new Map<string, {
    route: RoutingRevisionRoute
    environmentId: string
    revisionId: string
    publishedAt: Date
  }>()
  for (const revision of revisionRows) {
    for (const route of revision.payload.routes) {
      if (activeByRouteId.has(route.id)) continue
      if (route.isSupportRoute) continue
      if (route.productVisibility !== 'public') continue
      if (!['active', 'deprecated'].includes(route.productLifecycle)) continue
      if (!['published', 'deprecated'].includes(route.versionState)) continue
      activeByRouteId.set(route.id, {
        route,
        environmentId: revision.environmentId,
        revisionId: revision.revisionId,
        publishedAt: revision.publishedAt
      })
    }
  }

  const productIds = Array.from(new Set(
    Array.from(activeByRouteId.values()).map(item => item.route.productId)
  ))
  if (productIds.length === 0) return []

  const productRows = await db.select().from(apiProducts)
    .where(inArray(apiProducts.id, productIds))
  const productsById = new Map(productRows.map(product => [product.id, product]))

  return Array.from(activeByRouteId.values()).flatMap((item) => {
    const product = productsById.get(item.route.productId)
    return product ? [{ ...item, product }] : []
  })
}

export const activeRoutingCatalogService = {
  list: listActiveCatalogRoutes
}

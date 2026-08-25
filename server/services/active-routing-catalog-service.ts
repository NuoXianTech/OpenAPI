import { eq, inArray } from 'drizzle-orm'
import { db } from '~~/server/db/client'
import {
  apiProducts,
  platformRuntime,
  routingRevisions
} from '~~/server/db/schema'
import type { RoutingRevisionRoute } from '~~/server/types/routing-revision'

export interface ActiveCatalogRoute {
  route: RoutingRevisionRoute
  product: typeof apiProducts.$inferSelect
  revisionId: string
  publishedAt: Date
}

/**
 * Returns the route configuration that is actually serving traffic.
 *
 * Route behavior comes exclusively from the active immutable revision. Product
 * copy and category metadata stay editable and are joined by stable product id.
 * The public catalog groups the resulting routes by product.
 */
async function listActiveCatalogRoutes(): Promise<ActiveCatalogRoute[]> {
  const [revision] = await db.select({
    revisionId: routingRevisions.id,
    publishedAt: routingRevisions.publishedAt,
    payload: routingRevisions.configPayload
  }).from(platformRuntime)
    .innerJoin(routingRevisions, eq(routingRevisions.id, platformRuntime.activeRevisionId))
    .limit(1)
  if (!revision) return []

  const routes = revision.payload.routes.filter(route => (
    !route.isSupportRoute
    && route.productVisibility === 'public'
    && ['active', 'deprecated'].includes(route.productLifecycle)
    && ['published', 'deprecated'].includes(route.versionState)
  ))
  if (routes.length === 0) return []

  const productIds = Array.from(new Set(routes.map(route => route.productId)))
  const productRows = await db.select().from(apiProducts)
    .where(inArray(apiProducts.id, productIds))
  const productsById = new Map(productRows.map(product => [product.id, product]))

  return routes.flatMap((route) => {
    const product = productsById.get(route.productId)
    return product
      ? [{
          route,
          product,
          revisionId: revision.revisionId,
          publishedAt: revision.publishedAt
        }]
      : []
  })
}

export const activeRoutingCatalogService = {
  list: listActiveCatalogRoutes
}

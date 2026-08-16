import { asc, eq } from 'drizzle-orm'
import { db } from '~~/server/db/client'
import { apiProducts, apiRoutes, apiVersions, upstreamServices } from '~~/server/db/schema'
import { publicApiRouteCondition } from './public-api-query'

export const apiScopeService = {
  async listPublishedProductScopes() {
    const rows = await db.select({
      productId: apiProducts.id,
      productSlug: apiProducts.slug,
      productName: apiProducts.name,
      version: apiVersions.version,
      method: apiRoutes.method,
      path: apiRoutes.pathPattern
    }).from(apiRoutes)
      .innerJoin(apiVersions, eq(apiVersions.id, apiRoutes.apiVersionId))
      .innerJoin(apiProducts, eq(apiProducts.id, apiVersions.productId))
      .innerJoin(upstreamServices, eq(upstreamServices.id, apiRoutes.upstreamServiceId))
      .where(publicApiRouteCondition)
      .orderBy(asc(apiProducts.name), asc(apiRoutes.pathPattern), asc(apiRoutes.method))

    const products = new Map<string, {
      id: string
      scope: string
      name: string
      apiPath: string
      httpMethods: Set<string>
    }>()
    for (const row of rows) {
      const item = products.get(row.productId) ?? {
        id: row.productId,
        scope: `product:${row.productSlug}`,
        name: row.productName,
        apiPath: row.path,
        httpMethods: new Set<string>()
      }
      item.httpMethods.add(row.method)
      products.set(row.productId, item)
    }

    return Array.from(products.values()).map(item => ({
      id: item.id,
      scope: item.scope,
      name: item.name,
      apiPath: item.apiPath,
      httpMethod: Array.from(item.httpMethods).sort().join(',')
    }))
  }
}

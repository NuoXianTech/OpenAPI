import { activeRoutingCatalogService } from '~~/server/services/active-routing-catalog-service'

export const apiScopeService = {
  async listPublishedProductScopes() {
    const routes = await activeRoutingCatalogService.list()
    const products = new Map<string, {
      id: string
      scope: string
      name: string
      apiPath: string
      httpMethods: Set<string>
    }>()

    for (const item of routes) {
      const current = products.get(item.route.productId) ?? {
        id: item.route.productId,
        scope: `product:${item.route.productSlug}`,
        name: item.product.name,
        apiPath: item.route.pathPattern,
        httpMethods: new Set<string>()
      }
      current.httpMethods.add(item.route.method)
      products.set(item.route.productId, current)
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

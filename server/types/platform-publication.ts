import type { ServiceConnectionView } from '#shared/types/service-control'
import type {
  apiProducts,
  apiRoutes,
  apiVersions,
  upstreamServices,
  upstreamTargets
} from '~~/server/db/schema'

export type HttpMethod = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface RouteBinding {
  route: typeof apiRoutes.$inferSelect
  version: typeof apiVersions.$inferSelect
  product: typeof apiProducts.$inferSelect
  upstream: typeof upstreamServices.$inferSelect
}

export type UpstreamView = typeof upstreamServices.$inferSelect & {
  targets: Array<typeof upstreamTargets.$inferSelect>
  connection: ServiceConnectionView | null
}

export type PublicationStatus
  = | 'available'
    | 'live'
    | 'pending'
    | 'retiring'
    | 'disabled'

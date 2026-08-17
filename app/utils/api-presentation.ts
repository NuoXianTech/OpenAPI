import { API_STATUS } from '#shared/config/api-status'
import type { ApiCatalogEndpoint } from '#shared/types/api'

type ApiStatusColor = 'success' | 'info' | 'warning' | 'error' | 'neutral'

interface ApiStatusMeta {
  label: string
  color: ApiStatusColor
  icon: string
}

interface ApiStatusDescriptor {
  labelKey: string
  color: ApiStatusColor
  icon: string
}

type TranslateStatusLabel = (key: string) => string

export function getAggregateEndpointCost(
  endpoints: readonly Pick<ApiCatalogEndpoint, 'creditsCost'>[]
): number {
  if (endpoints.length === 0) return 0
  const costs = endpoints.map(endpoint => endpoint.creditsCost)
  const first = costs[0] ?? 0
  return costs.every(cost => cost === first) ? first : -1
}

export function areAllEndpointsPaid(
  endpoints: readonly Pick<ApiCatalogEndpoint, 'creditsCost'>[]
): boolean {
  return endpoints.length > 0
    && endpoints.every(endpoint => endpoint.creditsCost > 0)
}

function getApiStatusDescriptor(status: number): ApiStatusDescriptor {
  switch (status) {
    case API_STATUS.normal:
      return { labelKey: 'common.states.active', color: 'success', icon: 'i-mdi-check-circle-outline' }
    case API_STATUS.abnormal:
      return { labelKey: 'common.states.inactive', color: 'error', icon: 'i-mdi-alert-circle-outline' }
    case API_STATUS.maintenance:
      return { labelKey: 'common.states.maintenance', color: 'warning', icon: 'i-mdi-wrench-outline' }
    case API_STATUS.deprecated:
      return { labelKey: 'common.states.deprecated', color: 'neutral', icon: 'i-mdi-archive-outline' }
    case API_STATUS.automatic:
      return { labelKey: 'common.states.automatic', color: 'info', icon: 'i-lucide-refresh-cw' }
    default:
      return { labelKey: 'common.states.unknown', color: 'neutral', icon: 'i-mdi-help-circle-outline' }
  }
}

export function resolveApiStatusMeta(
  status: number,
  translate: TranslateStatusLabel
): ApiStatusMeta {
  const { labelKey, color, icon } = getApiStatusDescriptor(status)
  return {
    label: translate(labelKey),
    color,
    icon
  }
}

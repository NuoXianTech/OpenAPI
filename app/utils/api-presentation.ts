import { API_STATUS } from '#shared/config/api-status'

export type ApiStatusColor = 'success' | 'info' | 'warning' | 'error' | 'neutral'

export interface ApiStatusMeta {
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

export function parseApiMethods(value = 'GET'): string[] {
  return value
    .split(',')
    .map(method => method.trim())
    .filter(Boolean)
}

export function getApiMethodCost(
  method: string,
  methodCosts: Record<string, number> | undefined
): number {
  const value = methodCosts?.[method.toUpperCase()]
  return typeof value === 'number' && value > 0 ? value : 0
}

export function getAggregateApiMethodCost(
  methods: string[],
  methodCosts: Record<string, number> | undefined
): number {
  if (methods.length === 0) return 0
  const costs = methods.map(method => getApiMethodCost(method, methodCosts))
  const first = costs[0] ?? 0
  return costs.every(cost => cost === first) ? first : -1
}

export function areAllApiMethodsPaid(
  methods: string[],
  methodCosts: Record<string, number> | undefined
): boolean {
  return methods.length > 0 && methods.every(method => getApiMethodCost(method, methodCosts) > 0)
}

function getApiStatusDescriptor(status: number): ApiStatusDescriptor {
  switch (status) {
    case API_STATUS.normal:
      return { labelKey: 'common.states.active', color: 'success', icon: 'i-lucide-circle-check' }
    case API_STATUS.abnormal:
      return { labelKey: 'common.states.inactive', color: 'error', icon: 'i-lucide-circle-alert' }
    case API_STATUS.maintenance:
      return { labelKey: 'common.states.maintenance', color: 'warning', icon: 'i-lucide-wrench' }
    case API_STATUS.deprecated:
      return { labelKey: 'common.states.deprecated', color: 'neutral', icon: 'i-lucide-archive' }
    case API_STATUS.automatic:
      return { labelKey: 'common.states.automatic', color: 'info', icon: 'i-lucide-refresh-cw' }
    default:
      return { labelKey: 'common.states.unknown', color: 'neutral', icon: 'i-lucide-circle-help' }
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

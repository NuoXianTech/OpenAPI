export const API_STATUS = {
  unknown: -1,
  abnormal: 0,
  normal: 1,
  maintenance: 2,
  deprecated: 3,
  automatic: 4
} as const

const API_STATUS_VALUES = [
  API_STATUS.unknown,
  API_STATUS.abnormal,
  API_STATUS.normal,
  API_STATUS.maintenance,
  API_STATUS.deprecated,
  API_STATUS.automatic
] as const

export const API_AUTO_STATUS_SAMPLE_SIZE = 100
export const API_AUTO_STATUS_CACHE_TTL_MS = 30_000
export const API_AUTO_STATUS_WINDOW_MS = 24 * 60 * 60 * 1_000
export const API_AUTO_STATUS_MIN_SUCCESS_RATE = 0.8

interface ApiStatusSelectItem {
  label: string
  value: number
}

export const ADMIN_API_STATUS_ITEMS: ApiStatusSelectItem[] = [
  { label: '自动', value: API_STATUS.automatic },
  { label: '正常', value: API_STATUS.normal },
  { label: '异常', value: API_STATUS.abnormal },
  { label: '未知', value: API_STATUS.unknown },
  { label: '维护', value: API_STATUS.maintenance },
  { label: '废弃', value: API_STATUS.deprecated }
]

export const PUBLIC_API_STATUS_FILTER_ITEMS: ApiStatusSelectItem[] = [
  { label: '正常', value: API_STATUS.normal },
  { label: '异常', value: API_STATUS.abnormal },
  { label: '维护', value: API_STATUS.maintenance },
  { label: '废弃', value: API_STATUS.deprecated },
  { label: '未知', value: API_STATUS.unknown }
]

export function isApiStatusValue(value: number): boolean {
  return API_STATUS_VALUES.includes(value as typeof API_STATUS_VALUES[number])
}

export function isAutomaticApiStatus(value: number): boolean {
  return value === API_STATUS.automatic
}

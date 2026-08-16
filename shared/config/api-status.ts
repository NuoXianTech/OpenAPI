export const API_STATUS = {
  unknown: -1,
  abnormal: 0,
  normal: 1,
  maintenance: 2,
  deprecated: 3,
  automatic: 4
} as const

export const API_AUTO_STATUS_SAMPLE_SIZE = 100
export const API_AUTO_STATUS_CACHE_TTL_MS = 30_000
export const API_AUTO_STATUS_WINDOW_MS = 24 * 60 * 60 * 1_000
export const API_AUTO_STATUS_MIN_AVAILABILITY_RATE = 0.8

export function isAutomaticApiStatus(value: number): boolean {
  return value === API_STATUS.automatic
}

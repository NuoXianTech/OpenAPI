export function normalizeIgnoredStatisticsStatusCodes(statusCodes: readonly number[] | undefined): number[] {
  if (!statusCodes) return []
  return [...new Set(statusCodes
    .map(statusCode => Math.trunc(statusCode))
    .filter(statusCode => Number.isFinite(statusCode) && statusCode >= 100 && statusCode <= 599))]
}

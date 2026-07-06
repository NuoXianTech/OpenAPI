interface FetchLikeError {
  data?: { message?: unknown }
  statusCode?: number
  status?: number
  statusMessage?: unknown
  message?: unknown
}

export function parseFetchError(
  err: unknown,
  fallback: string,
  codeMap?: Record<number, string>
): string {
  if (err && typeof err === 'object') {
    const e = err as FetchLikeError
    const dataMessage = e.data?.message
    if (typeof dataMessage === 'string' && dataMessage) {
      return dataMessage
    }

    if (codeMap) {
      const status = e.statusCode ?? e.status
      if (typeof status === 'number') {
        if (codeMap[status]) return codeMap[status]
        if (status >= 500 && codeMap[500]) return codeMap[500]
      }
    }

    if (typeof e.statusMessage === 'string' && e.statusMessage) {
      return e.statusMessage
    }
  }

  if (err instanceof Error && err.message) {
    return err.message
  }

  return fallback
}

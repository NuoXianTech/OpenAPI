import { createError, getHeader, getRequestURL } from 'h3'
import type { H3Event } from 'h3'

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

function sameOrigin(value: string, event: H3Event): boolean {
  try {
    const origin = new URL(value)
    const requestOrigin = getRequestURL(event).origin
    return origin.origin === requestOrigin
  } catch {
    return false
  }
}

/**
 * Reject browser cross-site mutations that carry the Platform auth cookie.
 * Non-browser clients often omit both headers, so an absent Origin/Referer is
 * intentionally allowed; callers can still use the API with tokens or other
 * non-cookie credentials.  `Sec-Fetch-Site` provides an additional signal
 * when browsers send it.
 */
export function assertSameOriginMutation(event: H3Event): void {
  if (!STATE_CHANGING_METHODS.has(event.method.toUpperCase())) return

  const fetchSite = getHeader(event, 'sec-fetch-site')?.trim().toLowerCase()
  if (fetchSite === 'cross-site') {
    throw createError({
      statusCode: 403,
      message: 'forbidden',
      data: { code: 'CSRF_ORIGIN_MISMATCH' }
    })
  }

  const origin = getHeader(event, 'origin')?.trim()
  if (origin && !sameOrigin(origin, event)) {
    throw createError({
      statusCode: 403,
      message: 'forbidden',
      data: { code: 'CSRF_ORIGIN_MISMATCH' }
    })
  }

  if (origin) return

  const referer = getHeader(event, 'referer')?.trim()
  if (referer && !sameOrigin(referer, event)) {
    throw createError({
      statusCode: 403,
      message: 'forbidden',
      data: { code: 'CSRF_ORIGIN_MISMATCH' }
    })
  }
}

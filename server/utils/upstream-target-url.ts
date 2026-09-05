import { validateUpstreamTargetUrl } from '#shared/utils/upstream-target'
import { createApplicationError } from '~~/server/errors/application-error'

export function normalizeUpstreamTargetUrl(value: string): URL {
  const validation = validateUpstreamTargetUrl(value)
  if (validation.issue === 'invalid') {
    throw createApplicationError({
      statusCode: 400,
      message: 'upstream target URL is invalid',
      data: { code: 'UPSTREAM_URL_INVALID' }
    })
  }
  if (validation.issue === 'protocol') {
    throw createApplicationError({
      statusCode: 400,
      message: 'upstream target must use HTTP or HTTPS',
      data: { code: 'UPSTREAM_PROTOCOL_INVALID' }
    })
  }
  if (validation.issue === 'restricted') {
    throw createApplicationError({
      statusCode: 400,
      message: 'upstream target must not contain credentials, query, or fragment',
      data: { code: 'UPSTREAM_URL_INVALID' }
    })
  }
  if (validation.issue === 'publicHttp') {
    throw createApplicationError({
      statusCode: 400,
      message: 'public upstream targets must use HTTPS',
      data: { code: 'PUBLIC_UPSTREAM_REQUIRES_HTTPS' }
    })
  }
  const url = validation.url!
  url.pathname = url.pathname === '/' ? '' : url.pathname.replace(/\/$/, '')
  return url
}

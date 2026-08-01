import { getHeader, setResponseHeader } from 'h3'
import type { AdminClientIpStatus } from '#shared/types/client-ip'
import { clientIpConfigService } from '~~/server/services/client-ip-config-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { resolveClientIp } from '~~/server/utils/client-ip'
import { normalizeClientIp } from '~~/server/utils/request-meta'

function truncateHeader(value: string | undefined): string | null {
  if (!value) return null
  return value.length > 1000 ? `${value.slice(0, 1000)}…` : value
}

export default defineAdminEventHandler(async (event): Promise<AdminClientIpStatus> => {
  setResponseHeader(event, 'Cache-Control', 'private, no-store')

  const effective = await clientIpConfigService.getEffectiveConfig()
  const peerIp = normalizeClientIp(event.node.req.socket?.remoteAddress)
  const cfConnectingIp = getHeader(event, 'cf-connecting-ip')
  const xForwardedFor = getHeader(event, 'x-forwarded-for')
  const resolution = resolveClientIp({
    peerIp,
    cfConnectingIp,
    xForwardedFor,
    config: effective
  })

  return {
    effective,
    request: {
      peerIp,
      clientIp: resolution.clientIp,
      reason: resolution.reason,
      cfConnectingIp: truncateHeader(cfConnectingIp),
      xForwardedFor: truncateHeader(xForwardedFor)
    }
  }
})

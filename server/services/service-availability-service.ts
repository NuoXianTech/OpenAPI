import { createHash } from 'node:crypto'
import type {
  ServiceAvailability,
  ServiceDescription,
  ServiceTargetAvailability
} from '#shared/types/service-control'
import { buildServiceControlUrl } from '~~/server/utils/service-control-client'

const AVAILABILITY_PROBE_TIMEOUT_MS = 1_500

interface AvailabilityTarget {
  id: string
  baseUrl: string
  enabled: boolean
}

interface ServiceAvailabilitySnapshot {
  overall: ServiceAvailability
  targets: Map<string, ServiceTargetAvailability>
}

const pendingAvailabilityRequests = new Map<string, Promise<boolean>>()

async function requestTargetAvailability(
  baseUrl: string,
  readinessPath: string,
  controlPath: string,
  serviceToken: string
): Promise<boolean> {
  try {
    const readiness = await fetch(
      buildServiceControlUrl(baseUrl, readinessPath),
      {
        headers: { accept: 'application/json' },
        redirect: 'manual',
        signal: AbortSignal.timeout(AVAILABILITY_PROBE_TIMEOUT_MS)
      }
    )
    const ready = readiness.ok
    await readiness.body?.cancel().catch(() => undefined)
    if (!ready) return false

    const control = await fetch(
      buildServiceControlUrl(baseUrl, controlPath),
      {
        headers: {
          accept: 'application/json',
          authorization: `Service ${serviceToken}`
        },
        redirect: 'manual',
        signal: AbortSignal.timeout(AVAILABILITY_PROBE_TIMEOUT_MS)
      }
    )
    const authenticated = control.ok
    await control.body?.cancel().catch(() => undefined)
    return authenticated
  } catch {
    return false
  }
}

function targetAvailability(
  baseUrl: string,
  readinessPath: string,
  controlPath: string,
  serviceToken: string
): Promise<boolean> {
  const tokenHash = createHash('sha256').update(serviceToken).digest('hex')
  const key = `${baseUrl}\n${readinessPath}\n${controlPath}\n${tokenHash}`
  const pending = pendingAvailabilityRequests.get(key)
  if (pending) return pending

  const result = requestTargetAvailability(
    baseUrl,
    readinessPath,
    controlPath,
    serviceToken
  )
  pendingAvailabilityRequests.set(key, result)
  const clearPending = () => {
    if (pendingAvailabilityRequests.get(key) === result) {
      pendingAvailabilityRequests.delete(key)
    }
  }
  void result.then(clearPending, clearPending)
  return result
}

export async function resolveServiceAvailability(
  description: ServiceDescription | null,
  targets: readonly AvailabilityTarget[],
  serviceToken: string | null
): Promise<ServiceAvailabilitySnapshot> {
  const targetStatuses = new Map<string, ServiceTargetAvailability>(
    targets.map(target => [target.id, 'unknown'])
  )
  const enabledTargets = targets.filter(target => target.enabled)
  if (!description || !serviceToken || enabledTargets.length === 0) {
    return { overall: 'unknown', targets: targetStatuses }
  }

  const availability = await Promise.all(enabledTargets.map(async target => ({
    id: target.id,
    online: await targetAvailability(
      target.baseUrl,
      description.readiness,
      description.configuration.state,
      serviceToken
    )
  })))
  for (const target of availability) {
    targetStatuses.set(target.id, target.online ? 'online' : 'offline')
  }
  const readyTargets = availability.filter(target => target.online).length
  const overall = readyTargets === enabledTargets.length
    ? 'online'
    : readyTargets > 0 ? 'degraded' : 'offline'
  return { overall, targets: targetStatuses }
}

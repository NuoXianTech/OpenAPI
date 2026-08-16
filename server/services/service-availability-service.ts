import type {
  ServiceAvailability,
  ServiceDescription
} from '#shared/types/service-control'
import { buildServiceControlUrl } from '~~/server/utils/service-control-client'

const READINESS_TIMEOUT_MS = 1_500

interface AvailabilityTarget {
  baseUrl: string
  enabled: boolean
}

const pendingReadinessRequests = new Map<string, Promise<boolean>>()

async function requestReadiness(
  baseUrl: string,
  readinessPath: string
): Promise<boolean> {
  try {
    const response = await fetch(
      buildServiceControlUrl(baseUrl, readinessPath),
      {
        headers: { accept: 'application/json' },
        redirect: 'manual',
        signal: AbortSignal.timeout(READINESS_TIMEOUT_MS)
      }
    )
    const ready = response.ok
    await response.body?.cancel().catch(() => undefined)
    return ready
  } catch {
    return false
  }
}

function targetReadiness(
  baseUrl: string,
  readinessPath: string
): Promise<boolean> {
  const key = `${baseUrl}\n${readinessPath}`
  const pending = pendingReadinessRequests.get(key)
  if (pending) return pending

  const result = requestReadiness(baseUrl, readinessPath)
  pendingReadinessRequests.set(key, result)
  const clearPending = () => {
    if (pendingReadinessRequests.get(key) === result) {
      pendingReadinessRequests.delete(key)
    }
  }
  void result.then(clearPending, clearPending)
  return result
}

export async function resolveServiceAvailability(
  description: ServiceDescription | null,
  targets: readonly AvailabilityTarget[]
): Promise<ServiceAvailability> {
  const enabledTargets = targets.filter(target => target.enabled)
  if (!description || enabledTargets.length === 0) return 'unknown'

  const readiness = await Promise.all(enabledTargets.map(target =>
    targetReadiness(target.baseUrl, description.readiness)
  ))
  const readyTargets = readiness.filter(Boolean).length
  if (readyTargets === enabledTargets.length) return 'online'
  if (readyTargets > 0) return 'degraded'
  return 'offline'
}

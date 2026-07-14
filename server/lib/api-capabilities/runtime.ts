import { loadApiCapabilityConfig } from './config-service'

const FAILURE_CACHE_TTL_MS = 5_000
const FAILURE_LOG_INTERVAL_MS = 60_000

interface CapabilityFailureState {
  expiresAt: number
  lastLoggedAt: number
}

const failureStates = new Map<string, CapabilityFailureState>()

function createCapabilityIdentity(pathVersion: string, code: string): string {
  return `${pathVersion}/${code}`
}

async function loadApiCapabilityValue(
  pathVersion: string,
  code: string,
  fieldKey: string,
  fallback: unknown
): Promise<unknown> {
  const identity = createCapabilityIdentity(pathVersion, code)
  const now = Date.now()
  const failureState = failureStates.get(identity)
  if (failureState && now < failureState.expiresAt) return fallback

  try {
    const config = await loadApiCapabilityConfig(pathVersion, code)
    const values = config.values[fieldKey]
    failureStates.delete(identity)
    return values
  } catch (error) {
    const lastLoggedAt = failureStates.get(identity)?.lastLoggedAt ?? 0
    failureStates.set(identity, {
      expiresAt: now + FAILURE_CACHE_TTL_MS,
      lastLoggedAt: now - lastLoggedAt >= FAILURE_LOG_INTERVAL_MS ? now : lastLoggedAt
    })
    if (now - lastLoggedAt >= FAILURE_LOG_INTERVAL_MS) {
      console.error(`[api-capabilities] Failed to load ${identity} config; declared capabilities are disabled.`, error)
    }
    return fallback
  }
}

export async function loadApiCapabilityStringSet(
  pathVersion: string,
  code: string,
  fieldKey: string
): Promise<Set<string>> {
  const values = await loadApiCapabilityValue(pathVersion, code, fieldKey, [])
  return new Set(Array.isArray(values) ? values.filter(value => typeof value === 'string') : [])
}

export async function loadApiCapabilityString(
  pathVersion: string,
  code: string,
  fieldKey: string
): Promise<string> {
  const value = await loadApiCapabilityValue(pathVersion, code, fieldKey, '')
  return typeof value === 'string' ? value : ''
}

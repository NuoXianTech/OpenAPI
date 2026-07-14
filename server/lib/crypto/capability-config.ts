import { loadApiCapabilityConfig } from '~~/server/lib/api-capabilities/config-service'
import { CRYPTO_CAPABILITY_KEY } from '~~/server/api-capabilities/v1/crypto'

const FAILURE_CACHE_TTL_MS = 5_000
const FAILURE_LOG_INTERVAL_MS = 60_000
let failureCacheExpiresAt = 0
let lastFailureLoggedAt = 0

function createDisabledAlgorithmSet(): Set<string> {
  return new Set<string>()
}

export async function getEnabledCryptoAlgorithmNames(): Promise<Set<string>> {
  const now = Date.now()
  if (now < failureCacheExpiresAt) return createDisabledAlgorithmSet()

  try {
    const config = await loadApiCapabilityConfig('v1', 'crypto')
    const configuredNames = config.values[CRYPTO_CAPABILITY_KEY.allowedAlgorithms]
    failureCacheExpiresAt = 0
    return new Set(Array.isArray(configuredNames) ? configuredNames.filter(name => typeof name === 'string') : [])
  } catch (error) {
    failureCacheExpiresAt = now + FAILURE_CACHE_TTL_MS
    if (now - lastFailureLoggedAt >= FAILURE_LOG_INTERVAL_MS) {
      lastFailureLoggedAt = now
      console.error('[api-capabilities] Failed to load v1/crypto config; all algorithms are disabled.', error)
    }
    return createDisabledAlgorithmSet()
  }
}

export async function isCryptoAlgorithmEnabled(name: string): Promise<boolean> {
  return (await getEnabledCryptoAlgorithmNames()).has(name)
}

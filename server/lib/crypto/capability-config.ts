import { loadApiCapabilityConfig } from '~~/server/lib/api-capabilities/config-service'
import { CRYPTO_CAPABILITY_KEY } from '~~/server/api-capabilities/v1/crypto'

export async function getEnabledCryptoAlgorithmNames(): Promise<Set<string>> {
  try {
    const config = await loadApiCapabilityConfig('v1', 'crypto')
    const configuredNames = config.values[CRYPTO_CAPABILITY_KEY.allowedAlgorithms]
    return new Set(Array.isArray(configuredNames) ? configuredNames.filter(name => typeof name === 'string') : [])
  } catch (error) {
    console.error('[api-capabilities] Failed to load v1/crypto config; all algorithms are disabled.', error)
    return new Set()
  }
}

export async function isCryptoAlgorithmEnabled(name: string): Promise<boolean> {
  return (await getEnabledCryptoAlgorithmNames()).has(name)
}

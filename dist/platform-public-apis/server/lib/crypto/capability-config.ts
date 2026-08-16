import { loadApiCapabilityStringSet } from '~~/server/lib/api-capabilities/runtime'
import { CRYPTO_CAPABILITY_KEY } from '~~/server/api-capabilities/v1/crypto'

export async function getEnabledCryptoAlgorithmNames(): Promise<Set<string>> {
  return loadApiCapabilityStringSet('v1', 'crypto', CRYPTO_CAPABILITY_KEY.allowedAlgorithms)
}

export async function isCryptoAlgorithmEnabled(name: string): Promise<boolean> {
  return (await getEnabledCryptoAlgorithmNames()).has(name)
}

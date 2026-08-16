import type { MaoyanRealtimeType } from '.'
import { loadApiCapabilityStringSet } from '~~/server/lib/api-capabilities/runtime'
import { MAOYAN_CAPABILITY_KEY } from '~~/server/api-capabilities/v1/maoyan'

export async function isMaoyanRankingEnabled(type: MaoyanRealtimeType | 'globalMovie'): Promise<boolean> {
  const enabledRankings = await loadApiCapabilityStringSet(
    'v1',
    'maoyan',
    MAOYAN_CAPABILITY_KEY.enabledRankings
  )
  return enabledRankings.has(type)
}

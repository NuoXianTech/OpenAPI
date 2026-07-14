import { loadApiCapabilityStringSet } from '~~/server/lib/api-capabilities/runtime'
import { PLAYER_CAPABILITY_KEY } from '~~/server/api-capabilities/v1/player'

export async function isPlayerEngineEnabled(engine: 'dplayer' | 'artplayer'): Promise<boolean> {
  const enabledEngines = await loadApiCapabilityStringSet(
    'v1',
    'player',
    PLAYER_CAPABILITY_KEY.enabledEngines
  )
  return enabledEngines.has(engine)
}

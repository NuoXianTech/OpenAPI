import { loadApiCapabilityStringSet } from '~~/server/lib/api-capabilities/runtime'
import { DOUBAO_CAPABILITY_KEY } from '~~/server/api-capabilities/v1/doubao'

export function getEnabledDoubaoImageSources(): Promise<Set<string>> {
  return loadApiCapabilityStringSet('v1', 'doubao', DOUBAO_CAPABILITY_KEY.enabledImageSources)
}

export function getEnabledDoubaoVideoSources(): Promise<Set<string>> {
  return loadApiCapabilityStringSet('v1', 'doubao', DOUBAO_CAPABILITY_KEY.enabledVideoSources)
}

import type { MusicPlatform } from './types'
import {
  loadApiCapabilityString,
  loadApiCapabilityStringSet
} from '~~/server/lib/api-capabilities/runtime'
import { MUSIC_CAPABILITY_KEY } from '~~/server/api-capabilities/v1/music'

export async function getEnabledMusicPlatforms(): Promise<Set<string>> {
  return loadApiCapabilityStringSet('v1', 'music', MUSIC_CAPABILITY_KEY.enabledPlatforms)
}

export async function isMusicPlatformEnabled(platform: MusicPlatform): Promise<boolean> {
  return (await getEnabledMusicPlatforms()).has(platform)
}

export function getMusicPlatformCookie(platform: MusicPlatform): Promise<string> {
  const fieldKey = MUSIC_CAPABILITY_KEY[`${platform}Cookie` as keyof typeof MUSIC_CAPABILITY_KEY]
  return loadApiCapabilityString('v1', 'music', fieldKey)
}

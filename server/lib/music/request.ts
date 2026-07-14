import type { H3Event } from 'h3'
import { getQuery, getRouterParam } from 'h3'
import { isMusicPlatform } from './client'
import type { MusicPlatform } from './types'
import { isMusicPlatformEnabled } from './capability-config'

export interface MusicRouteContext {
  platform: MusicPlatform
  id: string
}

export async function readMusicPlatform(event: H3Event): Promise<MusicPlatform | null> {
  const value = String(getQuery(event).platform || 'netease').trim().toLowerCase()
  if (!isMusicPlatform(value)) return null
  return await isMusicPlatformEnabled(value) ? value : null
}

export async function readMusicRouteContext(event: H3Event): Promise<MusicRouteContext | null> {
  const platform = await readMusicPlatform(event)
  const id = getRouterParam(event, 'id')?.trim()
  return platform && id ? { platform, id } : null
}

export function readBoundedInteger(value: unknown, fallback: number, minimum: number, maximum: number): number | null {
  if (value === undefined || value === null || value === '') return fallback
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null
}

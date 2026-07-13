import type { H3Event } from 'h3'
import { getQuery, getRouterParam } from 'h3'
import { isMusicPlatform } from './client'
import type { MusicPlatform } from './types'

export interface MusicRouteContext {
  platform: MusicPlatform
  id: string
}

export function readMusicPlatform(event: H3Event): MusicPlatform | null {
  const value = String(getQuery(event).platform || 'netease').trim().toLowerCase()
  return isMusicPlatform(value) ? value : null
}

export function readMusicRouteContext(event: H3Event): MusicRouteContext | null {
  const platform = readMusicPlatform(event)
  const id = getRouterParam(event, 'id')?.trim()
  return platform && id ? { platform, id } : null
}

export function readBoundedInteger(value: unknown, fallback: number, minimum: number, maximum: number): number | null {
  if (value === undefined || value === null || value === '') return fallback
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null
}

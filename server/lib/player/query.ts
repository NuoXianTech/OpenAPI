import {
  ARTPLAYER_LANGS,
  ARTPLAYER_TYPES,
  DPLAYER_LANGS,
  DPLAYER_TYPES,
  type ArtplayerOptions,
  type DplayerOptions
} from './types'
import { readQueryNumber, readQueryString } from '~~/server/utils/request-query'

function readEnumValue<TValue extends string>(
  value: unknown,
  allowed: readonly TValue[],
  fallback: TValue
): TValue {
  const normalized = readQueryString(value).trim().toLowerCase()
  return allowed.includes(normalized as TValue) ? normalized as TValue : fallback
}

function readOptionalUrl(value: unknown): string {
  const raw = readQueryString(value).trim()
  if (!raw) return ''
  return isHttpUrl(raw) ? raw : ''
}

function readRequiredUrl(value: unknown): string | null {
  const raw = readQueryString(value).trim()
  if (!raw || !isHttpUrl(raw)) return null
  return raw
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  const normalized = readQueryString(value).trim().toLowerCase()
  if (!normalized) return fallback
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  return fallback
}

function readVolume(value: unknown): number {
  const volume = readQueryNumber(value)
  return volume !== undefined && volume >= 0 && volume <= 1 ? volume : 0.7
}

function readTheme(value: unknown): string {
  const theme = readQueryString(value).trim()
  return /^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(theme) ? theme : '#f00'
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function parseDplayerOptions(query: Record<string, unknown>): DplayerOptions | null {
  const url = readRequiredUrl(query.url)
  if (!url) return null

  return {
    url,
    type: readEnumValue(query.type, Object.values(DPLAYER_TYPES), DPLAYER_TYPES.auto),
    cover: readOptionalUrl(query.cover),
    live: readBoolean(query.live, false),
    muted: readBoolean(query.muted, false),
    autoplay: readBoolean(query.autoplay, false),
    hideplay: readBoolean(query.hideplay, false),
    loop: readBoolean(query.loop, false),
    lang: readEnumValue(query.lang, Object.values(DPLAYER_LANGS), DPLAYER_LANGS.zhCn),
    volume: readVolume(query.volume)
  }
}

export function parseArtplayerOptions(query: Record<string, unknown>): ArtplayerOptions | null {
  const url = readRequiredUrl(query.url)
  if (!url) return null

  return {
    id: readQueryString(query.id).trim(),
    url,
    type: readEnumValue(query.type, Object.values(ARTPLAYER_TYPES), ARTPLAYER_TYPES.auto),
    lang: readEnumValue(query.lang, Object.values(ARTPLAYER_LANGS), ARTPLAYER_LANGS.zhCn),
    poster: readOptionalUrl(query.poster),
    theme: readTheme(query.theme),
    volume: readVolume(query.volume),
    islive: readBoolean(query.islive, false),
    muted: readBoolean(query.muted, false),
    autoplay: readBoolean(query.autoplay, false),
    autoplayback: readBoolean(query.autoplayback, false),
    hideplay: readBoolean(query.hideplay, false),
    automini: readBoolean(query.automini, false),
    loop: readBoolean(query.loop, false),
    flip: readBoolean(query.flip, true),
    playbackrate: readBoolean(query.playbackrate, true),
    aspectratio: readBoolean(query.aspectratio, true),
    setting: readBoolean(query.setting, true),
    hotkey: readBoolean(query.hotkey, true),
    pip: readBoolean(query.pip, true),
    mutex: readBoolean(query.mutex, true),
    fullscreen: readBoolean(query.fullscreen, true),
    fullscreenweb: readBoolean(query.fullscreenweb, false),
    miniprogressbar: readBoolean(query.miniprogressbar, false),
    playsinline: readBoolean(query.playsinline, true)
  }
}

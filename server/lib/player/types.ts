export const DPLAYER_TYPES = {
  auto: 'auto',
  hls: 'hls',
  flv: 'flv',
  dash: 'dash',
  normal: 'normal'
} as const

export const DPLAYER_LANGS = {
  en: 'en',
  zhCn: 'zh-cn',
  zhTw: 'zh-tw',
  koKr: 'ko-kr',
  de: 'de',
  ja: 'ja',
  ru: 'ru'
} as const

export const ARTPLAYER_TYPES = {
  auto: '',
  m3u8: 'm3u8',
  flv: 'flv',
  mpd: 'mpd'
} as const

export const ARTPLAYER_LANGS = {
  en: 'en',
  zhCn: 'zh-cn'
} as const

export interface DplayerOptions {
  url: string
  type: typeof DPLAYER_TYPES[keyof typeof DPLAYER_TYPES]
  cover: string
  live: boolean
  muted: boolean
  autoplay: boolean
  hideplay: boolean
  loop: boolean
  lang: typeof DPLAYER_LANGS[keyof typeof DPLAYER_LANGS]
  volume: number
}

export interface ArtplayerOptions {
  id: string
  url: string
  type: typeof ARTPLAYER_TYPES[keyof typeof ARTPLAYER_TYPES]
  lang: typeof ARTPLAYER_LANGS[keyof typeof ARTPLAYER_LANGS]
  poster: string
  theme: string
  volume: number
  islive: boolean
  muted: boolean
  autoplay: boolean
  autoplayback: boolean
  hideplay: boolean
  automini: boolean
  loop: boolean
  flip: boolean
  playbackrate: boolean
  aspectratio: boolean
  setting: boolean
  hotkey: boolean
  pip: boolean
  mutex: boolean
  fullscreen: boolean
  fullscreenweb: boolean
  miniprogressbar: boolean
  playsinline: boolean
}

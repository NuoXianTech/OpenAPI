export const MUSIC_PLATFORMS = ['netease', 'tencent', 'kugou', 'baidu', 'kuwo'] as const

export type MusicPlatform = typeof MUSIC_PLATFORMS[number]

export interface MusicTrack {
  id: string | number
  name: string
  artist: string[]
  album: string
  pic_id: string | number
  url_id: string | number
  lyric_id: string | number
  source: MusicPlatform
}

export interface MusicResourceUrl {
  url: string
  size?: number
  br?: number
}

export interface MusicLyrics {
  lyric: string
  tlyric: string
}

export interface MusicSearchOptions {
  keyword: string
  platform: MusicPlatform
  type: number
  page: number
  pageSize: number
}

export interface MusicProviderMetadata {
  code: MusicPlatform
  name: string
  capabilities: string[]
}

export interface NeteaseArtist { name?: unknown }
export interface NeteaseAlbum { name?: unknown, pic?: unknown, pic_str?: unknown, picUrl?: unknown }
export interface NeteaseTrack { id?: unknown, name?: unknown, ar?: unknown, al?: unknown }

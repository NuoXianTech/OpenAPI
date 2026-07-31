export const MUSIC_PLATFORMS = ['netease', 'tencent', 'kugou', 'baidu', 'kuwo'] as const
export const MUSIC_OPERATIONS = ['search', 'song', 'album', 'artist', 'playlist', 'url', 'lrc', 'pic'] as const

export type MusicPlatform = typeof MUSIC_PLATFORMS[number]
export type MusicOperation = typeof MUSIC_OPERATIONS[number]
export type MusicCollectionOperation = Extract<MusicOperation, 'song' | 'album' | 'artist' | 'playlist'>

export interface MusicTrack {
  id: string | number
  name: string
  artists: string[]
  album: string
  pictureId: string | number
  audioId: string | number
  lyricsId: string | number
  platform: MusicPlatform
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
  page: number
  limit: number
}

export interface PublicMusicTrack {
  title: string
  artist: string
  album: string
  url: string
  pic: string
  lrc: string
}

export interface NeteaseArtist { name?: unknown }
export interface NeteaseAlbum { name?: unknown, pic?: unknown, pic_str?: unknown, picUrl?: unknown }
export interface NeteaseTrack { id?: unknown, name?: unknown, ar?: unknown, al?: unknown }

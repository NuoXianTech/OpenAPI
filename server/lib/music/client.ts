import { getBaiduArtist, getBaiduLyrics, getBaiduPicture, getBaiduTracks, getBaiduUrl, searchBaidu } from './baidu'
import { getKugouArtist, getKugouLyrics, getKugouPicture, getKugouTracks, getKugouUrl, searchKugou } from './kugou'
import { getKuwoArtist, getKuwoLyrics, getKuwoPicture, getKuwoTracks, getKuwoUrl, searchKuwo } from './kuwo'
import { getNeteaseArtistTracks, getNeteaseLyrics, getNeteasePicture, getNeteaseTracks, getNeteaseUrl, searchNetease } from './netease'
import { getTencentArtist, getTencentLyrics, getTencentPicture, getTencentTracks, getTencentUrl, searchTencent } from './tencent'
import { MUSIC_PLATFORMS, type MusicLyrics, type MusicPlatform, type MusicProviderMetadata, type MusicResourceUrl, type MusicSearchOptions, type MusicTrack } from './types'

interface MusicProvider {
  search(keyword: string, type: number, page: number, limit: number): Promise<MusicTrack[]>
  tracks(operation: 'song' | 'album' | 'playlist', id: string): Promise<MusicTrack[]>
  artist(id: string, limit: number): Promise<MusicTrack[]>
  url(id: string, bitrate: number): Promise<MusicResourceUrl>
  lyrics(id: string): Promise<MusicLyrics>
  picture(id: string, size: number): Promise<MusicResourceUrl>
}

const providers: Record<MusicPlatform, MusicProvider> = {
  netease: { search: searchNetease, tracks: getNeteaseTracks, artist: getNeteaseArtistTracks, url: getNeteaseUrl, lyrics: getNeteaseLyrics, picture: (id, size) => Promise.resolve(getNeteasePicture(id, size)) },
  tencent: { search: (keyword, _type, page, limit) => searchTencent(keyword, page, limit), tracks: getTencentTracks, artist: getTencentArtist, url: getTencentUrl, lyrics: getTencentLyrics, picture: (id, size) => Promise.resolve(getTencentPicture(id, size)) },
  kugou: { search: (keyword, _type, page, limit) => searchKugou(keyword, page, limit), tracks: getKugouTracks, artist: getKugouArtist, url: getKugouUrl, lyrics: getKugouLyrics, picture: (id, _size) => getKugouPicture(id) },
  baidu: { search: (keyword, _type, page, limit) => searchBaidu(keyword, page, limit), tracks: getBaiduTracks, artist: getBaiduArtist, url: getBaiduUrl, lyrics: getBaiduLyrics, picture: (id, _size) => getBaiduPicture(id) },
  kuwo: { search: (keyword, _type, page, limit) => searchKuwo(keyword, page, limit), tracks: getKuwoTracks, artist: getKuwoArtist, url: (id, _bitrate) => getKuwoUrl(id), lyrics: getKuwoLyrics, picture: (id, _size) => getKuwoPicture(id) }
}

export function isMusicPlatform(value: string): value is MusicPlatform {
  return MUSIC_PLATFORMS.some(platform => platform === value)
}

export function listMusicProviders(): MusicProviderMetadata[] {
  const names: Record<MusicPlatform, string> = { netease: '网易云音乐', tencent: 'QQ 音乐', kugou: '酷狗音乐', baidu: '百度音乐', kuwo: '酷我音乐' }
  return MUSIC_PLATFORMS.map(code => ({ code, name: names[code], capabilities: ['search', 'song', 'album', 'artist', 'playlist', 'url', 'lyrics', 'picture'] }))
}

export function searchMusic(options: MusicSearchOptions): Promise<MusicTrack[]> {
  return providers[options.platform].search(options.keyword, options.type, options.page, options.pageSize)
}
export function getMusicSongs(platform: MusicPlatform, operation: 'song' | 'album' | 'playlist', id: string): Promise<MusicTrack[]> { return providers[platform].tracks(operation, id) }
export function getArtistSongs(platform: MusicPlatform, id: string, limit: number): Promise<MusicTrack[]> { return providers[platform].artist(id, limit) }
export function getMusicUrl(platform: MusicPlatform, id: string, bitrate: number): Promise<MusicResourceUrl> { return providers[platform].url(id, bitrate) }
export function getMusicLyrics(platform: MusicPlatform, id: string): Promise<MusicLyrics> { return providers[platform].lyrics(id) }
export function getMusicPicture(platform: MusicPlatform, id: string, size: number): Promise<MusicResourceUrl> { return providers[platform].picture(id, size) }

import { getBaiduArtist, getBaiduLyrics, getBaiduPicture, getBaiduTracks, getBaiduUrl, searchBaidu } from './baidu'
import { getKugouArtist, getKugouLyrics, getKugouPicture, getKugouTracks, getKugouUrl, searchKugou } from './kugou'
import { getKuwoArtist, getKuwoLyrics, getKuwoPicture, getKuwoTracks, getKuwoUrl, searchKuwo } from './kuwo'
import { getNeteaseArtistTracks, getNeteaseLyrics, getNeteasePicture, getNeteaseTracks, getNeteaseUrl, searchNetease } from './netease'
import { getTencentArtist, getTencentLyrics, getTencentPicture, getTencentTracks, getTencentUrl, searchTencent } from './tencent'
import { MUSIC_PLATFORMS, type MusicCollectionOperation, type MusicLyrics, type MusicPlatform, type MusicResourceUrl, type MusicSearchOptions, type MusicTrack } from './types'

interface MusicProvider {
  search(keyword: string, page: number, limit: number): Promise<MusicTrack[]>
  tracks(operation: 'song' | 'album' | 'playlist', id: string): Promise<MusicTrack[]>
  artist(id: string, limit: number): Promise<MusicTrack[]>
  url(id: string, bitrate: number): Promise<MusicResourceUrl>
  lyrics(id: string): Promise<MusicLyrics>
  picture(id: string, size: number): Promise<MusicResourceUrl>
}

const providers: Record<MusicPlatform, MusicProvider> = {
  netease: { search: searchNetease, tracks: getNeteaseTracks, artist: getNeteaseArtistTracks, url: getNeteaseUrl, lyrics: getNeteaseLyrics, picture: (id, size) => Promise.resolve(getNeteasePicture(id, size)) },
  tencent: { search: searchTencent, tracks: getTencentTracks, artist: getTencentArtist, url: getTencentUrl, lyrics: getTencentLyrics, picture: (id, size) => Promise.resolve(getTencentPicture(id, size)) },
  kugou: { search: searchKugou, tracks: getKugouTracks, artist: getKugouArtist, url: getKugouUrl, lyrics: getKugouLyrics, picture: (id, _size) => getKugouPicture(id) },
  baidu: { search: searchBaidu, tracks: getBaiduTracks, artist: getBaiduArtist, url: getBaiduUrl, lyrics: getBaiduLyrics, picture: (id, _size) => getBaiduPicture(id) },
  kuwo: { search: searchKuwo, tracks: getKuwoTracks, artist: getKuwoArtist, url: (id, _bitrate) => getKuwoUrl(id), lyrics: getKuwoLyrics, picture: (id, _size) => getKuwoPicture(id) }
}

export function isMusicPlatform(value: string): value is MusicPlatform {
  return MUSIC_PLATFORMS.some(platform => platform === value)
}

export function searchMusic(options: MusicSearchOptions): Promise<MusicTrack[]> {
  return providers[options.platform].search(options.keyword, options.page, options.limit)
}

export function getMusicTracks(
  platform: MusicPlatform,
  operation: MusicCollectionOperation,
  id: string,
  limit: number
): Promise<MusicTrack[]> {
  return operation === 'artist'
    ? providers[platform].artist(id, limit)
    : providers[platform].tracks(operation, id)
}

export function getMusicUrl(platform: MusicPlatform, id: string): Promise<MusicResourceUrl> {
  return providers[platform].url(id, 320)
}

export function getMusicLyrics(platform: MusicPlatform, id: string): Promise<MusicLyrics> {
  return providers[platform].lyrics(id)
}

export function getMusicPicture(platform: MusicPlatform, id: string): Promise<MusicResourceUrl> {
  return providers[platform].picture(id, 300)
}

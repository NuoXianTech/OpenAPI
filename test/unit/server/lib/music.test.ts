import { afterEach, describe, expect, it, vi } from 'vitest'
import { mergeCookieHeader, parseJsonResponseText } from '~~/server/lib/music/common'
import { getNeteasePicture } from '~~/server/lib/music/netease'
import { getTencentPicture } from '~~/server/lib/music/tencent'
import { isMusicPlatform } from '~~/server/lib/music/client'
import { getKugouUrl } from '~~/server/lib/music/kugou'
import { formatMusicLyrics, normalizeMusicRedirectUrl, toPublicMusicTracks } from '~~/server/lib/music/public-contract'
import { parseMusicRequestQuery } from '~~/server/lib/music/request'
import { MUSIC_PLATFORMS } from '~~/server/lib/music/types'

const musicCapabilityMocks = vi.hoisted(() => ({
  getMusicPlatformCookie: vi.fn().mockResolvedValue('')
}))

vi.mock('~~/server/lib/music/capability-config', () => ({
  getMusicPlatformCookie: musicCapabilityMocks.getMusicPlatformCookie,
  getEnabledMusicPlatforms: vi.fn().mockResolvedValue(new Set(['netease', 'tencent', 'kugou', 'baidu', 'kuwo'])),
  isMusicPlatformEnabled: vi.fn().mockResolvedValue(true)
}))

afterEach(() => {
  vi.restoreAllMocks()
  musicCapabilityMocks.getMusicPlatformCookie.mockReset().mockResolvedValue('')
})

describe('music API helpers', () => {
  it('recognizes all supported Meting platforms', () => {
    expect(MUSIC_PLATFORMS).toEqual(['netease', 'tencent', 'kugou', 'baidu', 'kuwo'])
    MUSIC_PLATFORMS.forEach(platform => expect(isMusicPlatform(platform)).toBe(true))
    expect(isMusicPlatform('unknown')).toBe(false)
  })

  it('parses the unified server/type/id request contract', () => {
    expect(parseMusicRequestQuery({ id: '周杰伦' })).toEqual({
      ok: true,
      data: {
        platform: 'netease',
        operation: 'search',
        id: '周杰伦',
        page: 1,
        limit: 30
      }
    })
    expect(parseMusicRequestQuery({ server: 'tencent', type: 'artist', id: '42', limit: '20' })).toEqual({
      ok: true,
      data: {
        platform: 'tencent',
        operation: 'artist',
        id: '42',
        page: 1,
        limit: 20
      }
    })
    expect(parseMusicRequestQuery({ q: '旧参数' })).toMatchObject({ ok: false, code: 'UNSUPPORTED_PARAMETER' })
    expect(parseMusicRequestQuery({ type: '1', id: '旧搜索类型' })).toMatchObject({ ok: false, code: 'INVALID_TYPE' })
  })

  it('hides provider resource IDs behind directly callable links', () => {
    const [track] = toPublicMusicTracks([{
      id: 1,
      name: '晴天',
      artists: ['周杰伦'],
      album: '叶惠美',
      pictureId: 'picture-id',
      audioId: 'audio-id',
      lyricsId: 'lyrics-id',
      platform: 'netease'
    }], new URL('https://api.example.com/v1/music?server=netease&type=search&id=test'))

    expect(track).toEqual({
      title: '晴天',
      artist: '周杰伦',
      album: '叶惠美',
      url: 'https://api.example.com/v1/music?server=netease&type=url&id=audio-id',
      pic: 'https://api.example.com/v1/music?server=netease&type=pic&id=picture-id',
      lrc: 'https://api.example.com/v1/music?server=netease&type=lrc&id=lyrics-id'
    })
    expect(track).not.toHaveProperty('audioId')
    expect(track).not.toHaveProperty('pictureId')
    expect(track).not.toHaveProperty('lyricsId')
  })

  it('merges translated lyrics and normalizes redirect URLs', () => {
    expect(formatMusicLyrics({
      lyric: '[00:01.00]Hello\n[00:02.00]World',
      tlyric: '[00:01.000]你好'
    })).toBe('[00:01.00]Hello (你好)\n[00:02.00]World')
    expect(normalizeMusicRedirectUrl('tencent', 'http://ws.stream.qqmusic.qq.com/test.mp3'))
      .toBe('https://dl.stream.qqmusic.qq.com/test.mp3')
    expect(normalizeMusicRedirectUrl('netease', 'javascript:alert(1)')).toBeNull()
  })

  it('parses JSON, JSONP, BOM and trailing non-JSON content', () => {
    expect(parseJsonResponseText('{"code":0}')).toEqual({ code: 0 })
    expect(parseJsonResponseText('MusicJsonCallback({"code":0});')).toEqual({ code: 0 })
    expect(parseJsonResponseText('\uFEFF  callback({"items":[1,2]}) trailing')).toEqual({ items: [1, 2] })
    expect(() => parseJsonResponseText('upstream unavailable')).toThrow('无效数据')
  })

  it('generates deterministic provider picture URLs', () => {
    expect(getNeteasePicture('109951170048506929', 300).url).toMatch(/^https:\/\/p3\.music\.126\.net\/.+\/109951170048506929\.jpg\?param=300y300$/)
    expect(getTencentPicture('003v4UL61IYlTY', 500).url).toBe('https://y.gtimg.cn/music/photo_new/T002R500x500M000003v4UL61IYlTY.jpg?max_age=2592000')
  })

  it('merges built-in and configured cookies without malformed separators', () => {
    expect(mergeCookieHeader('os=android;', '; MUSIC_U=secret')).toBe('os=android; MUSIC_U=secret')
    expect(mergeCookieHeader('', 'uin=123')).toBe('uin=123')
  })

  it('uses the signed Kugou member endpoint when login cookies are configured', async () => {
    musicCapabilityMocks.getMusicPlatformCookie.mockResolvedValueOnce(
      't=member-token; KugooID=10001; mid=device-mid; dfid=device-dfid'
    )
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: { encode_album_audio_id: 'audio-id' }
      })))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: { play_url: 'https://example.com/member.mp3', filesize: 1024, bitrate: 320000 }
      })))

    await expect(getKugouUrl('song-hash', 320)).resolves.toEqual({
      url: 'https://example.com/member.mp3',
      size: 1024,
      br: 320
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('signature=')
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({
      cookie: expect.stringContaining('KugooID=10001')
    })
  })
})

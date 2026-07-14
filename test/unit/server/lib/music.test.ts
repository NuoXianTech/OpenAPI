import { afterEach, describe, expect, it, vi } from 'vitest'
import { mergeCookieHeader, parseJsonResponseText } from '~~/server/lib/music/common'
import { getNeteasePicture } from '~~/server/lib/music/netease'
import { getTencentPicture } from '~~/server/lib/music/tencent'
import { isMusicPlatform, listMusicProviders } from '~~/server/lib/music/client'
import { getKugouUrl } from '~~/server/lib/music/kugou'

const musicCapabilityMocks = vi.hoisted(() => ({
  getMusicPlatformCookie: vi.fn().mockResolvedValue('')
}))

vi.mock('~~/server/lib/music/capability-config', () => ({
  getMusicPlatformCookie: musicCapabilityMocks.getMusicPlatformCookie,
  getEnabledMusicPlatforms: vi.fn().mockResolvedValue(new Set(['netease', 'tencent', 'kugou', 'baidu', 'kuwo'])),
  isMusicPlatformEnabled: vi.fn().mockResolvedValue(true)
}))

const expectedCapabilities = ['search', 'song', 'album', 'artist', 'playlist', 'url', 'lyrics', 'picture']

afterEach(() => {
  vi.restoreAllMocks()
  musicCapabilityMocks.getMusicPlatformCookie.mockReset().mockResolvedValue('')
})

describe('music API helpers', () => {
  it('exposes all Meting platforms and capabilities', () => {
    const providers = listMusicProviders()
    expect(providers.map(provider => provider.code)).toEqual(['netease', 'tencent', 'kugou', 'baidu', 'kuwo'])
    expect(providers).toHaveLength(5)
    providers.forEach(provider => expect(provider.capabilities).toEqual(expectedCapabilities))
    providers.forEach(provider => expect(isMusicPlatform(provider.code)).toBe(true))
    expect(isMusicPlatform('unknown')).toBe(false)
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

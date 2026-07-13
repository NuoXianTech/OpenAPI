import { describe, expect, it } from 'vitest'
import { parseJsonResponseText } from '~~/server/lib/music/common'
import { getNeteasePicture } from '~~/server/lib/music/netease'
import { getTencentPicture } from '~~/server/lib/music/tencent'
import { isMusicPlatform, listMusicProviders } from '~~/server/lib/music/client'

const expectedCapabilities = ['search', 'song', 'album', 'artist', 'playlist', 'url', 'lyrics', 'picture']

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
})

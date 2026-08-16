import { describe, expect, it } from 'vitest'
import { createBingImageUrl, createBingMarkdown, resolveBingCoverUrl } from '~~/server/lib/bing/image'
import { DEFAULT_BING_ENCODE, isBingEncode, type BingImageRecord } from '~~/server/lib/bing/types'

describe('bing image helpers', () => {
  const sourceUrl = 'https://bing.com/th?id=OHR.Example_ZH-CN1234567890_1366x768.jpg&rf=LaDigue_1920x1080.jpg&pid=hp'

  it('uses JSON as the default response format', () => {
    expect(DEFAULT_BING_ENCODE).toBe('json')
    expect(isBingEncode('image-4k')).toBe(true)
  })

  it('normalizes Bing image urls to requested sizes', () => {
    expect(createBingImageUrl(sourceUrl)).toBe('https://bing.com/th?id=OHR.Example_ZH-CN1234567890_1920x1080.jpg')
    expect(createBingImageUrl(sourceUrl, '768x1366')).toBe('https://bing.com/th?id=OHR.Example_ZH-CN1234567890_768x1366.jpg')
    expect(createBingImageUrl(sourceUrl, 'UHD')).toBe('https://bing.com/th?id=OHR.Example_ZH-CN1234567890_UHD.jpg')
  })

  it('keeps the UHD URL as a separate public response field', () => {
    const cover = createBingImageUrl(sourceUrl)
    const cover4k = createBingImageUrl(cover, 'UHD')

    expect(cover).toContain('_1920x1080.jpg')
    expect(cover4k).toContain('_UHD.jpg')
    expect(cover4k).not.toBe(cover)
  })

  it('selects mobile wallpaper for mobile user agents in auto mode', () => {
    const mobileUserAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148'

    expect(resolveBingCoverUrl(sourceUrl, 'auto', mobileUserAgent)).toContain('_768x1366.jpg')
    expect(resolveBingCoverUrl(sourceUrl, 'pc', mobileUserAgent)).toContain('_1920x1080.jpg')
  })

  it('formats markdown with title, headline, description, image, and copyright', () => {
    const record: BingImageRecord = {
      title: '每日壁纸',
      headline: '山海之间',
      description: '一张来自必应的每日图片。',
      cover: 'https://bing.com/th?id=OHR.Example_1920x1080.jpg',
      cover_4k: 'https://bing.com/th?id=OHR.Example_UHD.jpg',
      main_text: '今日小知识',
      copyright: 'Copyright',
      update_date: '2026-07-09 12:00:00',
      update_date_at: 1783579200000
    }

    expect(createBingMarkdown(record)).toBe([
      '# 每日壁纸',
      '',
      '## 山海之间',
      '',
      '一张来自必应的每日图片。',
      '',
      '![每日壁纸](https://bing.com/th?id=OHR.Example_1920x1080.jpg)',
      '',
      '*Copyright*'
    ].join('\n'))
  })
})

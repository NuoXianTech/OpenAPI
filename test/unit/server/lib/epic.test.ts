import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  formatEpicMarkdown,
  formatEpicText,
  getEpicFreeGames,
  normalizeEpicResponse,
  type EpicFreeGame
} from '~~/server/lib/epic'

const sharedCacheMocks = vi.hoisted(() => ({
  values: new Map<string, unknown>(),
  getSharedCache: vi.fn(async (options: { key: string, loader: () => Promise<unknown> }) => {
    if (sharedCacheMocks.values.has(options.key)) return sharedCacheMocks.values.get(options.key)
    const value = await options.loader()
    sharedCacheMocks.values.set(options.key, value)
    return value
  })
}))

const safeFetchMocks = vi.hoisted(() => ({
  safeFetch: vi.fn(),
  readLimitedText: vi.fn((response: Response) => response.text())
}))

vi.mock('~~/server/utils/shared-cache', () => ({
  getSharedCache: sharedCacheMocks.getSharedCache
}))

vi.mock('~~/server/utils/safe-fetch', () => ({
  safeFetch: safeFetchMocks.safeFetch,
  readLimitedText: safeFetchMocks.readLimitedText
}))

afterEach(() => {
  vi.clearAllMocks()
  sharedCacheMocks.values.clear()
})

function createGame(options: {
  id: string
  title: string
  offerType?: string
  start: string
  end: string
  upcoming?: boolean
  discount?: number
  slug?: string
}) {
  const promotion = {
    promotionalOffers: [{
      startDate: options.start,
      endDate: options.end,
      discountSetting: { discountPercentage: options.discount ?? 0 }
    }]
  }
  return {
    id: options.id,
    title: options.title,
    offerType: options.offerType || 'BASE_GAME',
    productSlug: options.slug || null,
    urlSlug: `fallback-${options.id}`,
    catalogNs: { mappings: [{ pageSlug: `mapping-${options.id}` }] },
    offerMappings: [],
    description: `${options.title} 描述`,
    seller: { name: '测试发行商' },
    effectiveDate: '2020-01-01T00:00:00Z',
    expiryDate: null,
    keyImages: [
      { type: 'Thumbnail', url: 'https://cdn1.epicgames.com/thumb.jpg' },
      { type: 'OfferImageWide', url: `http://cdn1.epicgames.com/${options.id}.jpg` }
    ],
    price: {
      totalPrice: {
        originalPrice: 6200,
        currencyInfo: { decimals: 2 },
        fmtPrice: { originalPrice: '¥62.00' }
      }
    },
    promotions: options.upcoming
      ? { promotionalOffers: [], upcomingPromotionalOffers: [promotion] }
      : { promotionalOffers: [promotion], upcomingPromotionalOffers: [] }
  }
}

describe('epic free games helpers', () => {
  it('normalizes current and upcoming free games while filtering invalid offers', () => {
    const now = Date.parse('2026-08-01T00:00:00Z')
    const games = normalizeEpicResponse({
      data: {
        Catalog: {
          searchStore: {
            elements: [
              createGame({
                id: 'upcoming',
                title: 'Mystery Game',
                start: '2026-08-06T15:00:00Z',
                end: '2026-08-13T15:00:00Z',
                upcoming: true
              }),
              createGame({
                id: 'current',
                title: '当前游戏',
                start: '2026-07-30T15:00:00Z',
                end: '2026-08-06T15:00:00Z',
                slug: 'current-game/home'
              }),
              createGame({
                id: 'paid',
                title: '非免费游戏',
                start: '2026-07-30T15:00:00Z',
                end: '2026-08-06T15:00:00Z',
                discount: 50
              }),
              createGame({
                id: 'dlc',
                title: 'DLC',
                offerType: 'DLC',
                start: '2026-07-30T15:00:00Z',
                end: '2026-08-06T15:00:00Z'
              })
            ]
          }
        }
      }
    }, now)

    expect(games).toHaveLength(2)
    expect(games[0]).toMatchObject({
      id: 'current',
      title: '当前游戏',
      is_free_now: true,
      original_price: 62,
      original_price_desc: '¥62.00',
      cover: 'https://cdn1.epicgames.com/current.jpg',
      link: 'https://store.epicgames.com/zh-CN/p/current-game/home'
    })
    expect(games[1]).toMatchObject({
      id: 'upcoming',
      title: '神秘游戏',
      is_free_now: false,
      link: 'https://store.epicgames.com/zh-CN/p/mapping-upcoming'
    })
    expect(games[0]?.free_start).toBe('2026-07-30 23:00:00')
  })

  it('uses the shared cache and forwards the governance signal', async () => {
    safeFetchMocks.safeFetch.mockResolvedValueOnce(new Response(JSON.stringify({
      data: {
        Catalog: {
          searchStore: {
            elements: [createGame({
              id: 'future',
              title: '未来游戏',
              start: '2099-01-01T00:00:00Z',
              end: '2099-01-08T00:00:00Z',
              upcoming: true
            })]
          }
        }
      }
    })))
    const controller = new AbortController()

    const first = await getEpicFreeGames(controller.signal)
    const second = await getEpicFreeGames(controller.signal)

    expect(first).toHaveLength(1)
    expect(second).toEqual(first)
    expect(safeFetchMocks.safeFetch).toHaveBeenCalledTimes(1)
    expect(safeFetchMocks.safeFetch.mock.calls[0]?.[0]).toContain('/freeGamesPromotions?')
    expect(safeFetchMocks.safeFetch.mock.calls[0]?.[1]).toMatchObject({
      allowedHosts: ['store-site-backend-static-ipv4.ak.epicgames.com'],
      signal: controller.signal
    })
    expect(sharedCacheMocks.getSharedCache).toHaveBeenCalledWith(expect.objectContaining({
      key: 'cache:epic:free-games:cn',
      ttlSeconds: 600
    }))
  })

  it('formats text and escaped markdown outputs', () => {
    const game: EpicFreeGame = {
      id: 'test',
      title: '测试 [游戏]',
      cover: 'https://cdn1.epicgames.com/test.jpg',
      original_price: 62,
      original_price_desc: '¥62.00',
      description: '> 描述 <script> ![图片](https://example.com/image.png)',
      seller: '发行商 | 测试',
      is_free_now: true,
      free_start: '2026-07-30 23:00:00',
      free_start_at: Date.parse('2026-07-30T15:00:00Z'),
      free_end: '2026-08-06 23:00:00',
      free_end_at: Date.parse('2026-08-06T15:00:00Z'),
      link: 'https://store.epicgames.com/zh-CN/p/test'
    }

    expect(formatEpicText([game])).toContain('《测试 [游戏]》，现在免费，截至 2026-08-06 23:00')
    const markdown = formatEpicMarkdown([game])
    expect(markdown).toContain('[《测试 \\[游戏\\]》](<https://store.epicgames.com/zh-CN/p/test>)')
    expect(markdown).toContain('\\> 描述 \\<script\\> \\!\\[图片\\]\\(https://example\\.com/image\\.png\\)')
    expect(markdown).toContain('发行商 \\| 测试')
    expect(markdown).not.toContain('![图片]')
  })

  it('rejects malformed upstream data', () => {
    expect(() => normalizeEpicResponse({ code: 500 })).toThrow('无效游戏数据')
  })
})

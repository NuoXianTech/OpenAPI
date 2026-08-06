import { load } from 'cheerio'
import regionsJson from './regions.json'
import type { FuelPriceData, FuelPriceItem, FuelRegion, FuelRegionOption, FuelTrend } from './types'
import { waitForAbort } from '~~/server/utils/shared-cache'

const FUEL_PRICE_BASE_URL = 'http://www.qiyoujiage.com'

const CACHE_TTL_MS = 60 * 60 * 1000
const FUEL_PRICE_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'

interface FuelPriceCacheEntry {
  ts: number
  items: FuelPriceItem[]
  trend: FuelTrend | null
}

interface PendingFuelPriceEntry {
  promise: Promise<FuelPriceCacheEntry>
}

const regions = (regionsJson as FuelRegion[]).slice()
const sortedRegions = regions.slice().sort((a, b) => a.region.length - b.region.length)
const cache = new Map<string, FuelPriceCacheEntry>()
const pending = new Map<string, PendingFuelPriceEntry>()

function formatLocalDateTime(value: number | Date = Date.now()): string {
  const date = value instanceof Date ? value : new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  const second = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}

function normalizeRegionKeyword(region: string): string {
  return region.trim().replace(/\s+/g, '')
}

function toRegionOption(region: FuelRegion): FuelRegionOption {
  return {
    ...region,
    link: `${FUEL_PRICE_BASE_URL}${region.url}`
  }
}

export function listFuelRegions(): FuelRegionOption[] {
  return regions.map(toRegionOption)
}

export function findFuelRegion(region: string): FuelRegion | null {
  const keyword = normalizeRegionKeyword(region)
  if (!keyword) return null
  return sortedRegions.find(item => item.region.endsWith(keyword)) || null
}

export function parseFuelPrices(html: string): FuelPriceItem[] {
  const $ = load(html)
  const items: FuelPriceItem[] = []

  $('#youjia dl').each((_, dl) => {
    const $dl = $(dl)
    const dts = $dl.find('dt')
    const dds = $dl.find('dd')

    dts.each((index, dt) => {
      const name = $(dt).text().trim().replace(/^[^0-9]+/, '')
      const priceText = $(dds[index]).text().trim()
      const price = Number.parseFloat(priceText)
      if (!name || !Number.isFinite(price)) return

      items.push({
        name,
        price,
        price_desc: `${price.toFixed(2)} 元/升`
      })
    })
  })

  return items
}

export function parseFuelTrend(html: string): FuelTrend | null {
  const $ = load(html)
  const trendDiv = $('#youjiaCont > div')
    .filter((_, element) => {
      const style = $(element).attr('style') || ''
      return style.includes('border') && style.includes('#EA5146')
    })
    .first()

  const trendText = (trendDiv.length ? trendDiv.text() : $('#left > div').first().text()).replace(/\s+/g, '')
  if (!trendText) return null

  const dateMatch = /下次油价(\d+月\d+日\d+时)调整/.exec(trendText)
  const directionMatch = /预计(上调|下调|搁浅)/.exec(trendText)
  const tonMatch = /(上调|下调)(\d+)元\/吨/.exec(trendText)
  const literMatch = /\((\d+\.?\d*)元\/升[-~](\d+\.?\d*)元\/升\)/.exec(trendText)
  if (!dateMatch && !directionMatch) return null

  const direction = directionMatch?.[1] || '搁浅'
  const nextDate = dateMatch?.[1] || ''
  const changeTon = tonMatch ? Number.parseInt(tonMatch[2] || '0', 10) : 0
  const changeLiterMin = literMatch ? Number.parseFloat(literMatch[1] || '0') : 0
  const changeLiterMax = literMatch ? Number.parseFloat(literMatch[2] || '0') : 0
  const changeTonDesc = tonMatch ? `${direction}${tonMatch[2]}元/吨` : ''
  const changeLiterDesc = changeLiterMin && changeLiterMax
    ? `${changeLiterMin.toFixed(2)}元/升-${changeLiterMax.toFixed(2)}元/升`
    : ''
  const descParts: string[] = []

  if (nextDate) descParts.push(`下次调价时间: ${nextDate}`)
  if (direction !== '搁浅') {
    descParts.push(`预计${changeTonDesc}${changeLiterDesc ? ` (${changeLiterDesc})` : ''}`)
  } else {
    descParts.push('预计搁浅（不调整）')
  }

  return {
    next_adjustment_date: nextDate,
    direction,
    change_ton: changeTon,
    change_ton_desc: changeTonDesc,
    change_liter_min: changeLiterMin,
    change_liter_max: changeLiterMax,
    change_liter_desc: changeLiterDesc,
    description: descParts.join('，')
  }
}

async function fetchFuelPriceHtml(region: FuelRegion, signal?: AbortSignal): Promise<string> {
  const response = await fetch(`${FUEL_PRICE_BASE_URL}${region.url}`, {
    headers: {
      'user-agent': FUEL_PRICE_USER_AGENT
    },
    signal: signal ?? AbortSignal.timeout(15_000)
  })

  if (!response.ok) {
    throw new Error(`油价上游返回 HTTP ${response.status}`)
  }

  return response.text()
}

async function fetchFuelPriceEntry(region: FuelRegion, signal?: AbortSignal): Promise<FuelPriceCacheEntry> {
  const html = await fetchFuelPriceHtml(region, signal)
  const items = parseFuelPrices(html)
  if (items.length === 0) {
    throw new Error('油价页面结构异常，未解析到价格列表')
  }

  return {
    ts: Date.now(),
    items,
    trend: parseFuelTrend(html)
  }
}

async function getFuelPriceEntry(region: FuelRegion, forceUpdate = false, signal?: AbortSignal): Promise<FuelPriceCacheEntry> {
  const cacheKey = `FUEL_PRICE_${region.url}`
  if (forceUpdate) cache.delete(cacheKey)

  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return waitForAbort(Promise.resolve(cached), signal)
  }

  const pendingEntry = pending.get(cacheKey)
  if (pendingEntry) return waitForAbort(pendingEntry.promise, signal)

  // The shared producer uses its own upstream timeout. A request timeout only
  // cancels that request's wait and must not abort other callers.
  const promise = fetchFuelPriceEntry(region)
    .then((entry) => {
      cache.set(cacheKey, entry)
      return entry
    })
    .finally(() => {
      pending.delete(cacheKey)
    })

  pending.set(cacheKey, { promise })
  return waitForAbort(promise, signal)
}

export async function getFuelPriceData(region: FuelRegion, forceUpdate = false, signal?: AbortSignal): Promise<FuelPriceData> {
  const { items, trend, ts } = await getFuelPriceEntry(region, forceUpdate, signal)

  return {
    region: region.region,
    trend,
    items,
    link: `${FUEL_PRICE_BASE_URL}${region.url}`,
    updated: formatLocalDateTime(ts),
    updated_at: ts
  }
}

export function formatFuelPriceText(data: FuelPriceData): string {
  const trendText = data.trend ? `\n\n${data.trend.description}` : ''
  return [
    `今日油价 (${data.region})`,
    '',
    data.items.map(item => `${item.name}: ${item.price_desc}`).join('\n'),
    `${trendText}`,
    '',
    `更新时间: ${data.updated}`
  ].join('\n')
}

export function formatFuelPriceMarkdown(data: FuelPriceData): string {
  return [
    `# 今日油价 (${data.region})`,
    '',
    data.items.map(item => `- **${item.name}**: ${item.price_desc}`).join('\n'),
    data.trend ? `\n> ${data.trend.description}` : '',
    '',
    `更新时间: ${data.updated}`
  ].join('\n')
}

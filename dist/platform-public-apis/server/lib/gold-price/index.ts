import { getSharedCache } from '~~/server/utils/shared-cache'
import { readLimitedText, safeFetch } from '~~/server/utils/safe-fetch'

export const GOLD_PRICE_ENCODINGS = ['json', 'text', 'markdown', 'md'] as const
export type GoldPriceEncoding = typeof GOLD_PRICE_ENCODINGS[number]

export interface GoldMetalPrice {
  name: string
  sell_price: string
  today_price: string
  high_price: string
  low_price: string
  unit: string
  updated: string
  updated_at: number
}

export interface GoldStorePrice {
  brand: string
  product: string
  price: string
  unit: string
  formatted: string
  updated: string
  updated_at: number
}

export interface BankGoldPrice {
  bank: string
  product: string
  price: string
  unit: string
  formatted: string
  time: string
  updated: string
  updated_at: number
}

export interface RecycleGoldPrice {
  type: string
  price: string
  unit: string
  formatted: string
  purity: string
  updated: string
  updated_at: number
}

export interface GoldPriceData {
  date: string
  metals: GoldMetalPrice[]
  stores: GoldStorePrice[]
  banks: BankGoldPrice[]
  recycle: RecycleGoldPrice[]
}

interface UnknownRecord { [key: string]: unknown }

interface QuoteConfig {
  code: string
  name: string
  unit: string
}

const GOLD_QUOTE_HOST = 'api.jijinhao.com'
const GOLD_QUOTE_REFERER = 'https://quote.cngold.org/'
const GOLD_CACHE_TTL_SECONDS = 2 * 60
const GOLD_MAX_RESPONSE_BYTES = 512 * 1024
const MAX_DATE_TIMESTAMP = 8_640_000_000_000_000

const METAL_QUOTES: readonly QuoteConfig[] = [
  { code: 'JO_71', name: '黄金_9999', unit: '元/克' },
  { code: 'JO_70', name: '黄金_9995', unit: '元/克' },
  { code: 'JO_9753', name: '黄金_T+D', unit: '元/克' },
  { code: 'JO_165732', name: '沪金主力', unit: '元/克' },
  { code: 'JO_92233', name: '伦敦金(现货黄金)', unit: '美元/盎司' },
  { code: 'JO_12552', name: '纽约黄金(COMEX)', unit: '美元/盎司' },
  { code: 'JO_92232', name: '白银价格', unit: '美元/盎司' },
  { code: 'JO_92229', name: '铂金价格', unit: '美元/盎司' },
  { code: 'JO_92230', name: '钯金价格', unit: '美元/盎司' }
]

const STORE_QUOTES = [
  { code: 'JO_42660', brand: '周大福', product: '黄金' },
  { code: 'JO_42657', brand: '老凤祥', product: '黄金' },
  { code: 'JO_42625', brand: '周生生', product: '黄金' },
  { code: 'JO_42634', brand: '老庙', product: '黄金' }
] as const

const BANK_QUOTES = [
  { code: 'JO_78648', bank: '建设银行', product: '龙鼎金条' },
  { code: 'JO_321178', bank: '农业银行', product: '传世之宝金条' },
  { code: 'JO_78650', bank: '工商银行', product: '如意金条' },
  { code: 'JO_78656', bank: '平安银行', product: '和谐平安金条' }
] as const

const RECYCLE_QUOTES = [
  { code: 'JO_321453', type: '黄金回收', purity: '99.90%' },
  { code: 'JO_321465', type: '白银回收', purity: '足银' },
  { code: 'JO_321457', type: '铂金回收', purity: 'pt999' },
  { code: 'JO_321461', type: '钯金回收', purity: 'pd999' }
] as const

const ALL_QUOTE_CODES = [
  ...METAL_QUOTES.map(item => item.code),
  ...STORE_QUOTES.map(item => item.code),
  ...BANK_QUOTES.map(item => item.code),
  ...RECYCLE_QUOTES.map(item => item.code)
]
const GOLD_QUOTE_URL = `https://${GOLD_QUOTE_HOST}/quoteCenter/realTime.htm?codes=${ALL_QUOTE_CODES.join(',')}`
const SHANGHAI_DATE_TIME_FORMATTER = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23'
})
const SHANGHAI_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
})

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : ''
}

function readFiniteNumber(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null
  if (typeof value === 'string' && !value.trim()) return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function readQuote(payload: UnknownRecord, code: string): UnknownRecord | null {
  const quote = payload[code]
  return isRecord(quote) ? quote : null
}

function readDigits(quote: UnknownRecord): number {
  const digits = readFiniteNumber(quote.digits)
  return digits !== null && Number.isInteger(digits) && digits >= 0 && digits <= 6 ? digits : 2
}

function formatQuoteNumber(quote: UnknownRecord, field: string): string {
  const value = readFiniteNumber(quote[field])
  if (value === null || value <= 0) return 'N/A'
  const formatted = value.toFixed(readDigits(quote))
  return formatted.includes('.') ? formatted.replace(/\.?0+$/, '') : formatted
}

function readQuoteTimestamp(quote: UnknownRecord, fallback: number): number {
  const timestamp = readFiniteNumber(quote.time)
  return timestamp !== null && timestamp > 0 && timestamp <= MAX_DATE_TIMESTAMP ? Math.trunc(timestamp) : fallback
}

function readQuoteUnit(quote: UnknownRecord, fallback: string): string {
  return readString(quote.unit) || fallback
}

function formatShanghaiDateTime(timestamp: number): string {
  return SHANGHAI_DATE_TIME_FORMATTER.format(timestamp).replaceAll('/', '-')
}

function formatShanghaiDate(timestamp: number): string {
  return SHANGHAI_DATE_FORMATTER.format(timestamp)
}

function formatShanghaiTime(timestamp: number): string {
  return formatShanghaiDateTime(timestamp).slice(11)
}

export function parseGoldQuoteScript(text: string): UnknownRecord {
  const match = /^\uFEFF?\s*var\s+quote_json\s*=\s*(\{[\s\S]*\})\s*;?\s*$/.exec(text)
  if (!match?.[1]) throw new Error('金价上游返回格式已变化')

  let payload: unknown
  try {
    payload = JSON.parse(match[1]) as unknown
  } catch (error) {
    throw new Error('金价上游返回了无效 JSON 数据', { cause: error })
  }
  if (!isRecord(payload)) throw new Error('金价上游返回了无效行情数据')
  return payload
}

export function normalizeGoldPriceResponse(payload: unknown, now = Date.now()): GoldPriceData {
  if (!isRecord(payload)) throw new Error('金价上游返回了无效行情数据')

  const metals = METAL_QUOTES.flatMap((config) => {
    const quote = readQuote(payload, config.code)
    if (!quote) return []
    const updatedAt = readQuoteTimestamp(quote, now)
    return [{
      name: config.name,
      sell_price: formatQuoteNumber(quote, 'q63'),
      today_price: formatQuoteNumber(quote, 'q1'),
      high_price: formatQuoteNumber(quote, 'q3'),
      low_price: formatQuoteNumber(quote, 'q4'),
      unit: readQuoteUnit(quote, config.unit),
      updated: formatShanghaiDateTime(updatedAt),
      updated_at: updatedAt
    }]
  })
  if (metals.length === 0 || !metals.some(item => item.sell_price !== 'N/A')) {
    throw new Error('金价上游未返回可用贵金属行情')
  }

  const stores = STORE_QUOTES.flatMap((config) => {
    const quote = readQuote(payload, config.code)
    if (!quote) return []
    const price = formatQuoteNumber(quote, 'q63')
    const unit = readQuoteUnit(quote, '元/克')
    const updatedAt = readQuoteTimestamp(quote, now)
    return [{
      brand: config.brand,
      product: config.product,
      price,
      unit,
      formatted: price === 'N/A' ? price : `${price}${unit}`,
      updated: formatShanghaiDate(updatedAt),
      updated_at: updatedAt
    }]
  })

  const banks = BANK_QUOTES.flatMap((config) => {
    const quote = readQuote(payload, config.code)
    if (!quote) return []
    const price = formatQuoteNumber(quote, 'q63')
    const unit = readQuoteUnit(quote, '元/克')
    const updatedAt = readQuoteTimestamp(quote, now)
    return [{
      bank: config.bank,
      product: config.product,
      price,
      unit,
      formatted: price === 'N/A' ? price : `${price}${unit}`,
      time: formatShanghaiTime(updatedAt),
      updated: formatShanghaiDateTime(updatedAt),
      updated_at: updatedAt
    }]
  })

  const recycle = RECYCLE_QUOTES.flatMap((config) => {
    const quote = readQuote(payload, config.code)
    if (!quote) return []
    const price = formatQuoteNumber(quote, 'q63')
    const unit = readQuoteUnit(quote, '元/克')
    const updatedAt = readQuoteTimestamp(quote, now)
    return [{
      type: config.type,
      price,
      unit,
      formatted: price === 'N/A' ? price : `${price}${unit}`,
      purity: config.purity,
      updated: formatShanghaiDate(updatedAt),
      updated_at: updatedAt
    }]
  })

  return {
    date: formatShanghaiDate(now),
    metals,
    stores,
    banks,
    recycle
  }
}

async function fetchGoldPrice(signal?: AbortSignal): Promise<GoldPriceData> {
  let response: Response
  try {
    response = await safeFetch(GOLD_QUOTE_URL, {
      allowedHosts: [GOLD_QUOTE_HOST],
      headers: {
        'accept': 'application/javascript,text/javascript,*/*;q=0.8',
        'referer': GOLD_QUOTE_REFERER,
        'user-agent': 'Mozilla/5.0 Chrome/124 Safari/537.36'
      },
      signal: signal ?? AbortSignal.timeout(15_000)
    })
  } catch (error) {
    throw new Error('金价上游请求失败', { cause: error })
  }

  if (!response.ok) {
    await response.body?.cancel()
    throw new Error(`金价上游返回 HTTP ${response.status}`)
  }

  const script = await readLimitedText(response, GOLD_MAX_RESPONSE_BYTES)
  return normalizeGoldPriceResponse(parseGoldQuoteScript(script))
}

export async function getGoldPrice(signal?: AbortSignal): Promise<GoldPriceData> {
  const data = await getSharedCache({
    key: 'cache:gold-price:cn',
    ttlSeconds: GOLD_CACHE_TTL_SECONDS,
    loader: () => fetchGoldPrice(signal)
  })
  return {
    ...data,
    metals: data.metals.map(item => ({ ...item })),
    stores: data.stores.map(item => ({ ...item })),
    banks: data.banks.map(item => ({ ...item })),
    recycle: data.recycle.map(item => ({ ...item }))
  }
}

export function isGoldPriceEncoding(value: string): value is GoldPriceEncoding {
  return GOLD_PRICE_ENCODINGS.includes(value as GoldPriceEncoding)
}

function readLatestUpdatedAt(data: GoldPriceData): number {
  return Math.max(
    ...data.metals.map(item => item.updated_at),
    ...data.stores.map(item => item.updated_at),
    ...data.banks.map(item => item.updated_at),
    ...data.recycle.map(item => item.updated_at)
  )
}

export function formatGoldPriceText(data: GoldPriceData): string {
  const metalText = data.metals.map(item => `${item.name}: ${item.sell_price}${item.sell_price === 'N/A' ? '' : item.unit}`).join('\n')
  const storeText = data.stores.map(item => `${item.brand}: ${item.formatted}`).join('\n') || '暂无数据'
  const bankText = data.banks.map(item => `${item.bank}: ${item.formatted}`).join('\n') || '暂无数据'
  const recycleText = data.recycle.map(item => `${item.type}: ${item.formatted}`).join('\n') || '暂无数据'
  const updatedAt = readLatestUpdatedAt(data)

  return `贵金属价格 (${formatShanghaiDateTime(updatedAt)})\n\n〓 实时行情 〓\n${metalText}\n\n〓 各大金店今日金价 〓\n${storeText}\n\n〓 银行金条今日金价 〓\n${bankText}\n\n〓 黄金回收今日金价 〓\n${recycleText}`
}

function escapeMarkdownCell(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/([|<>])/g, '\\$1')
    .replace(/[\r\n]+/g, ' ')
}

export function formatGoldPriceMarkdown(data: GoldPriceData): string {
  const metalRows = data.metals.map(item => `| ${escapeMarkdownCell(item.name)} | ${item.sell_price} | ${item.today_price} | ${item.high_price} | ${item.low_price} | ${escapeMarkdownCell(item.unit)} |`).join('\n')
  const storeRows = data.stores.map(item => `| ${escapeMarkdownCell(item.brand)} | ${escapeMarkdownCell(item.product)} | ${escapeMarkdownCell(item.formatted)} | ${item.updated} |`).join('\n') || '| 暂无数据 | - | - | - |'
  const bankRows = data.banks.map(item => `| ${escapeMarkdownCell(item.bank)} | ${escapeMarkdownCell(item.product)} | ${escapeMarkdownCell(item.formatted)} | ${item.updated} |`).join('\n') || '| 暂无数据 | - | - | - |'
  const recycleRows = data.recycle.map(item => `| ${escapeMarkdownCell(item.type)} | ${escapeMarkdownCell(item.formatted)} | ${escapeMarkdownCell(item.purity)} | ${item.updated} |`).join('\n') || '| 暂无数据 | - | - | - |'
  const updatedAt = readLatestUpdatedAt(data)

  return `# 贵金属价格\n\n**更新时间**：${formatShanghaiDateTime(updatedAt)}\n\n## 实时行情\n\n| 品种 | 最新价 | 今日开盘 | 最高价 | 最低价 | 单位 |\n|------|--------|----------|--------|--------|------|\n${metalRows}\n\n## 各大金店今日金价\n\n| 黄金品牌 | 黄金品种 | 今日价格 | 报价日期 |\n|----------|----------|----------|----------|\n${storeRows}\n\n## 银行金条今日金价\n\n| 银行 | 金条品种 | 今日价格 | 报价时间 |\n|------|----------|----------|----------|\n${bankRows}\n\n## 黄金回收今日金价\n\n| 黄金种类 | 回收价格 | 纯度 | 报价日期 |\n|----------|----------|------|----------|\n${recycleRows}`
}

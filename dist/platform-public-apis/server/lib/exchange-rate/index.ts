import { getSharedCache } from '~~/server/utils/shared-cache'
import type { ExchangeRateData, ExchangeRateItem, ExchangeRateUpstreamResponse } from './types'

const EXCHANGE_RATE_API_URL = 'https://open.er-api.com/v6/latest'
const EXCHANGE_RATE_CACHE_TTL_SECONDS = 6 * 60 * 60
const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/
const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
})

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readUnixMilliseconds(value: unknown): number {
  const seconds = Number(value)
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error('汇率上游返回了无效更新时间')
  return seconds * 1000
}

function formatDateTime(timestamp: number): string {
  return DATE_TIME_FORMATTER.format(timestamp).replaceAll('/', '-')
}

function normalizeRates(value: unknown): ExchangeRateItem[] {
  if (!isRecord(value)) throw new Error('汇率上游返回了无效汇率数据')

  const rates = Object.entries(value)
    .filter(([currency, rate]) => CURRENCY_CODE_PATTERN.test(currency) && Number.isFinite(Number(rate)))
    .map(([currency, rate]) => ({ currency, rate: Number(rate) }))

  if (rates.length === 0) throw new Error('汇率上游未返回可用汇率')
  return rates
}

function normalizeExchangeRateResponse(payload: ExchangeRateUpstreamResponse): ExchangeRateData {
  if (payload.result !== 'success') throw new Error('汇率上游请求失败')

  const baseCode = typeof payload.base_code === 'string' ? payload.base_code.toUpperCase() : ''
  if (!CURRENCY_CODE_PATTERN.test(baseCode)) throw new Error('汇率上游返回了无效基准货币')

  const updatedAt = readUnixMilliseconds(payload.time_last_update_unix)
  const nextUpdatedAt = readUnixMilliseconds(payload.time_next_update_unix)

  return {
    base_code: baseCode,
    updated: formatDateTime(updatedAt),
    updated_at: updatedAt,
    next_updated: formatDateTime(nextUpdatedAt),
    next_updated_at: nextUpdatedAt,
    rates: normalizeRates(payload.rates)
  }
}

async function fetchExchangeRates(currency: string, signal?: AbortSignal): Promise<ExchangeRateData> {
  const response = await fetch(`${EXCHANGE_RATE_API_URL}/${encodeURIComponent(currency)}`, {
    headers: { accept: 'application/json' },
    signal: signal ?? AbortSignal.timeout(10_000)
  })
  if (!response.ok) throw new Error(`汇率上游返回 HTTP ${response.status}`)

  const payload = await response.json() as ExchangeRateUpstreamResponse
  return normalizeExchangeRateResponse(payload)
}

export function normalizeCurrencyCode(value: string): string | null {
  const currency = value.trim().toUpperCase()
  return CURRENCY_CODE_PATTERN.test(currency) ? currency : null
}

export function getExchangeRates(currency: string, signal?: AbortSignal): Promise<ExchangeRateData> {
  return getSharedCache({
    key: `cache:exchange-rate:${currency}`,
    ttlSeconds: EXCHANGE_RATE_CACHE_TTL_SECONDS,
    signal,
    loader: () => fetchExchangeRates(currency)
  })
}

export function formatExchangeRateText(data: ExchangeRateData): string {
  const rates = data.rates.slice(0, 20).map(item => `${item.currency} => ${item.rate}`).join('\n')
  return `${data.updated.slice(0, 10)} 的 ${data.base_code} 汇率\n\n${rates}`
}

export function formatExchangeRateMarkdown(data: ExchangeRateData): string {
  const rows = data.rates.slice(0, 30).map(item => `| **${item.currency}** | ${item.rate.toFixed(4)} |`).join('\n')
  return `# ${data.base_code} 汇率\n\n> 更新时间: ${data.updated}\n\n| 货币 | 汇率 |\n|------|------|\n${rows}\n\n*下次更新: ${data.next_updated}*`
}

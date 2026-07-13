export const EXCHANGE_RATE_ENCODINGS = ['json', 'text', 'markdown', 'md'] as const
export const DEFAULT_EXCHANGE_RATE_CURRENCY = 'CNY'
export const DEFAULT_EXCHANGE_RATE_ENCODING: ExchangeRateEncoding = 'json'

export type ExchangeRateEncoding = typeof EXCHANGE_RATE_ENCODINGS[number]

export interface ExchangeRateItem {
  currency: string
  rate: number
}

export interface ExchangeRateData {
  base_code: string
  updated: string
  updated_at: number
  next_updated: string
  next_updated_at: number
  rates: ExchangeRateItem[]
}

export interface ExchangeRateUpstreamResponse {
  result?: unknown
  time_last_update_unix?: unknown
  time_next_update_unix?: unknown
  base_code?: unknown
  rates?: unknown
}

export function isExchangeRateEncoding(value: string): value is ExchangeRateEncoding {
  return EXCHANGE_RATE_ENCODINGS.includes(value as ExchangeRateEncoding)
}

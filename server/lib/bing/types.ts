export const BING_ENCODES = ['image', 'json', 'text', 'markdown', 'md'] as const
export const BING_IMAGE_TYPES = ['auto', 'pc', 'mobile'] as const

export const DEFAULT_BING_ENCODE: BingEncode = 'image'
export const DEFAULT_BING_IMAGE_TYPE: BingImageType = 'auto'
export const BING_PRIMARY_URL = 'https://global.bing.com/?setmkt=zh-cn'
export const BING_ARCHIVE_URL = 'https://global.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&setmkt=zh-cn'
export const BING_BASE_URL = 'https://bing.com'
export const BING_CN_EDGE_IP = '157.255.219.143'
export const BING_CHROME_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'

export type BingEncode = typeof BING_ENCODES[number]
export type BingImageType = typeof BING_IMAGE_TYPES[number]

export interface BingImageRecord {
  title: string
  headline: string
  description: string
  cover: string
  cover_4k: string
  main_text: string
  copyright: string
  update_date: string
  update_date_at: number
}

export interface BingArchiveImage {
  url?: string
  title?: string
  copyright?: string
}

export interface BingArchiveResponse {
  images?: BingArchiveImage[]
}

export interface BingPrimaryImageContent {
  Description?: string
  Headline?: string
  Title?: string
  Copyright?: string
  Image?: {
    Url?: string
    Wallpaper?: string
    Downloadable?: boolean
  }
  QuickFact?: {
    MainText?: string
    LinkUrl?: string
    LinkText?: string
  }
}

export interface BingPrimaryMediaContent {
  ImageContent?: BingPrimaryImageContent
}

export interface BingPrimaryModel {
  MediaContents?: BingPrimaryMediaContent[]
}

export function isBingEncode(value: string): value is BingEncode {
  return BING_ENCODES.includes(value as BingEncode)
}

export function isBingImageType(value: string): value is BingImageType {
  return BING_IMAGE_TYPES.includes(value as BingImageType)
}

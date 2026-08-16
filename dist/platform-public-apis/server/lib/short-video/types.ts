export const SHORT_VIDEO_PLATFORMS = [
  'douyin',
  'kuaishou',
  'xiaohongshu',
  'bilibili',
  'weibo',
  'pipixia',
  'pipigx',
  'toutiao'
] as const

export type ShortVideoPlatform = typeof SHORT_VIDEO_PLATFORMS[number]
export type ShortVideoMediaType = 'video' | 'image' | 'live' | 'unknown'

export interface ShortVideoData {
  platform: ShortVideoPlatform
  type: ShortVideoMediaType
  author: string
  uid: string
  avatar: string
  like: number | null
  time: number | null
  title: string
  cover: string
  url: string
  images: string[]
  livePhotos: Array<{
    image: string
    video: string
  }>
  music: {
    title: string
    author: string
    url: string
    avatar: string
  } | null
}

export interface ShortVideoError extends Error {
  readonly name: 'ShortVideoError'
  readonly kind: 'input' | 'business'
  readonly status: number
  readonly code: string
  readonly retryAfter?: number
}

export interface ShortVideoFailure {
  status: number
  code: string
  message: string
  biz: boolean
  retryAfter?: number
}

export function createShortVideoError(
  kind: 'input' | 'business',
  status: number,
  code: string,
  message: string,
  retryAfter?: number
): ShortVideoError {
  return Object.assign(new Error(message), {
    name: 'ShortVideoError' as const,
    kind,
    status,
    code,
    ...(retryAfter === undefined ? {} : { retryAfter })
  })
}

function isShortVideoError(error: unknown): error is ShortVideoError {
  return error instanceof Error
    && error.name === 'ShortVideoError'
    && ((error as { kind?: unknown }).kind === 'input' || (error as { kind?: unknown }).kind === 'business')
    && typeof (error as { status?: unknown }).status === 'number'
    && typeof (error as { code?: unknown }).code === 'string'
}

export function classifyShortVideoError(error: unknown): ShortVideoFailure {
  if (isShortVideoError(error)) {
    return {
      status: error.status,
      code: error.code,
      message: error.message,
      biz: error.kind === 'business',
      retryAfter: error.retryAfter
    }
  }

  return {
    status: 502,
    code: 'UPSTREAM_ERROR',
    message: '短视频解析服务暂时不可用，请稍后重试',
    biz: true
  }
}

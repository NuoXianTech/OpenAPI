import type { H3Event } from 'h3'

export interface ApiResponse<T = unknown> {
  code: number
  msg: string
  data: T
  timestamp: number
}

export async function report<T>(
  event: H3Event,
  code: number | null,
  msg: string | null,
  data: T,
): Promise<ApiResponse<T>> {
  if (code !== null) {
    setResponseStatus(event, code)
  }
  else {
    setResponseStatus(event, 200)
  }

  return {
    code: code ?? 200,
    msg: msg ?? 'success',
    data,
    timestamp: Date.now(),
  }
}

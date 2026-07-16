export interface RunWithTimeoutOptions<TTimeoutResult> {
  timeoutMs: number
  onTimeout: () => TTimeoutResult
}

export function runWithTimeout<TResult, TTimeoutResult>(
  task: (signal: AbortSignal) => TResult | Promise<TResult>,
  options: RunWithTimeoutOptions<TTimeoutResult>
): Promise<TResult | TTimeoutResult> {
  const controller = new AbortController()
  const timeoutMs = Math.max(Math.trunc(options.timeoutMs), 1)
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  const timeoutResult = new Promise<TTimeoutResult>((resolve, reject) => {
    timeoutId = setTimeout(() => {
      try {
        resolve(options.onTimeout())
      } catch (error) {
        reject(error)
      } finally {
        controller.abort()
      }
    }, timeoutMs)
    timeoutId.unref?.()
  })

  const taskResult = Promise.resolve().then(() => task(controller.signal))
  return Promise.race([taskResult, timeoutResult]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId)
  })
}

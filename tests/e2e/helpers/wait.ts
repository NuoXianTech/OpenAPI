function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function waitForValue<T>(
  getter: () => Promise<T>,
  predicate: (value: T) => boolean,
  options: { timeoutMs?: number, intervalMs?: number } = {}
) {
  const timeoutMs = options.timeoutMs ?? 8_000
  const intervalMs = options.intervalMs ?? 150
  const deadline = Date.now() + timeoutMs

  let lastValue: T | null = null

  while (Date.now() <= deadline) {
    const value = await getter()
    lastValue = value

    if (predicate(value)) {
      return value
    }

    await sleep(intervalMs)
  }

  throw new Error(`waitForValue timeout after ${timeoutMs}ms; last value: ${JSON.stringify(lastValue)}`)
}

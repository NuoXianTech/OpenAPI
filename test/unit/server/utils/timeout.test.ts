import { describe, expect, it, vi } from 'vitest'
import { runWithTimeout } from '~~/server/utils/timeout'

describe('runWithTimeout', () => {
  it('returns the task result before the deadline', async () => {
    await expect(runWithTimeout(
      signal => signal.aborted ? 'aborted' : 'completed',
      { timeoutMs: 100, onTimeout: () => 'timeout' }
    )).resolves.toBe('completed')
  })

  it('returns the timeout result and aborts the task signal', async () => {
    vi.useFakeTimers()
    let taskSignal: AbortSignal | undefined
    const result = runWithTimeout(
      async (signal) => {
        taskSignal = signal
        await new Promise(() => undefined)
        return 'completed'
      },
      { timeoutMs: 100, onTimeout: () => 'timeout' }
    )

    await vi.advanceTimersByTimeAsync(100)

    await expect(result).resolves.toBe('timeout')
    expect(taskSignal?.aborted).toBe(true)
    vi.useRealTimers()
  })
})

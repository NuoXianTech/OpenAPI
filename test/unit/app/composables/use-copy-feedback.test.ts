import { afterEach, describe, expect, it, vi } from 'vitest'
import { useCopyFeedback } from '@/composables/use-copy-feedback'

const add = vi.fn()
const writeText = vi.fn()

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

function setupGlobals() {
  vi.stubGlobal('useToast', () => ({ add }))
  vi.stubGlobal('useI18n', () => ({ t: (key: string) => key }))
  vi.stubGlobal('navigator', { clipboard: { writeText } })
}

describe('useCopyFeedback', () => {
  it('reports a successful copy with custom feedback', async () => {
    setupGlobals()
    writeText.mockResolvedValue(undefined)
    const { copyText } = useCopyFeedback()

    await expect(copyText('value', {
      successTitle: 'Copied value',
      successIcon: 'i-mdi-check'
    })).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith('value')
    expect(add).toHaveBeenCalledWith({
      title: 'Copied value',
      icon: 'i-mdi-check',
      color: 'success'
    })
  })

  it('uses the default error feedback when copying fails', async () => {
    setupGlobals()
    writeText.mockRejectedValue(new Error('Clipboard unavailable'))
    const { copyText } = useCopyFeedback()

    await expect(copyText('value')).resolves.toBe(false)
    expect(add).toHaveBeenCalledWith({
      title: 'common.feedback.copyFailed',
      icon: undefined,
      color: 'error'
    })
  })
})

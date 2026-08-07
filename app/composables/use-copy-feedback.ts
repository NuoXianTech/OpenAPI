interface CopyFeedbackOptions {
  successTitle?: string
  errorTitle?: string
  successIcon?: string
  errorIcon?: string
}

export function useCopyFeedback() {
  const toast = useToast()
  const { t } = useI18n()

  async function copyText(text: string, options: CopyFeedbackOptions = {}): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text)
      toast.add({
        title: options.successTitle ?? t('common.feedback.copied'),
        icon: options.successIcon,
        color: 'success'
      })
      return true
    } catch {
      toast.add({
        title: options.errorTitle ?? t('common.feedback.copyFailed'),
        icon: options.errorIcon,
        color: 'error'
      })
      return false
    }
  }

  return { copyText }
}

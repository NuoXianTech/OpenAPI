import type { BadgeProps } from '@nuxt/ui'

export function platformStatusColor(status: string): BadgeProps['color'] {
  if (status === 'active' || status === 'published') return 'success'
  if (status === 'deprecated' || status === 'superseded') return 'warning'
  if (status === 'disabled' || status === 'retired' || status === 'failed') return 'error'
  return 'neutral'
}

export function formatPlatformDate(value: string | null, locale: string): string {
  if (!value) return '-'
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}

import type { NavigationMenuItem } from '@nuxt/ui'

export const ADMIN_REDEMPTION_CODES_PATH = '/admin/redemption-codes'

export const adminRedemptionCodesLinks: NavigationMenuItem[] = [
  { label: '兑换码', icon: 'i-mdi-ticket-percent-outline', to: ADMIN_REDEMPTION_CODES_PATH, exact: true },
  { label: '兑换记录', icon: 'i-mdi-clipboard-check-outline', to: `${ADMIN_REDEMPTION_CODES_PATH}/logs` }
]

export const adminRedemptionCodesQuickActions = [
  { label: '生成兑换码', icon: 'i-mdi-ticket-percent-outline', to: ADMIN_REDEMPTION_CODES_PATH }
]

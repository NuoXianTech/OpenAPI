import type { NavigationMenuItem } from '@nuxt/ui'

export const USER_CREDITS_PATH = '/user/credits'

export const userCreditsLinks: NavigationMenuItem[] = [
  { label: '概览', icon: 'i-mdi-wallet-outline', to: USER_CREDITS_PATH, exact: true },
  { label: '签到兑换', icon: 'i-mdi-gift-outline', to: `${USER_CREDITS_PATH}/earn` },
  { label: '流水明细', icon: 'i-mdi-format-list-bulleted', to: `${USER_CREDITS_PATH}/transactions` }
]

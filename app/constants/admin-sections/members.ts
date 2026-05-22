import type { NavigationMenuItem } from '@nuxt/ui'

export const ADMIN_MEMBERS_PATH = '/admin/members'

export const adminMembersLinks: NavigationMenuItem[] = [
  { label: '用户', icon: 'i-mdi-account-group-outline', to: ADMIN_MEMBERS_PATH, exact: true },
  { label: '积分流水', icon: 'i-mdi-cash-multiple', to: `${ADMIN_MEMBERS_PATH}/credit-transactions` },
  { label: '兑换码', icon: 'i-mdi-ticket-percent-outline', to: `${ADMIN_MEMBERS_PATH}/redemption-codes` },
  { label: '兑换记录', icon: 'i-mdi-clipboard-check-outline', to: `${ADMIN_MEMBERS_PATH}/redemption-records` }
]

export const adminMembersQuickActions = [
  { label: '生成兑换码', icon: 'i-mdi-ticket-percent-outline', to: `${ADMIN_MEMBERS_PATH}/redemption-codes` },
  { label: '调整用户积分', icon: 'i-mdi-cash-multiple', to: ADMIN_MEMBERS_PATH }
]

export const ADMIN_MEMBERS_PATH = '/admin/members'

export const adminMembersTabs = [
  { value: 'users', label: '用户', icon: 'i-mdi-account-group-outline' },
  { value: 'credit-transactions', label: '积分流水', icon: 'i-mdi-cash-multiple' },
  { value: 'redemption-codes', label: '兑换码', icon: 'i-mdi-ticket-percent-outline' },
  { value: 'redemption-records', label: '兑换记录', icon: 'i-mdi-clipboard-check-outline' }
] as const

export type AdminMembersTab = typeof adminMembersTabs[number]['value']

export const adminMembersHref = (tab: AdminMembersTab) => `${ADMIN_MEMBERS_PATH}#${tab}`

export const adminMembersQuickActions = [
  { tab: 'redemption-codes', label: '生成兑换码', icon: 'i-mdi-ticket-percent-outline' },
  { tab: 'users', label: '调整用户积分', icon: 'i-mdi-cash-multiple' }
] as const satisfies ReadonlyArray<{ tab: AdminMembersTab, label: string, icon: string }>

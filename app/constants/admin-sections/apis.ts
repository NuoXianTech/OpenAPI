export const ADMIN_API_HUB_PATH = '/admin/api-hub'

export const adminApiHubTabs = [
  { value: 'governance', label: '接口治理', icon: 'i-mdi-api' },
  { value: 'categories', label: '分类管理', icon: 'i-mdi-shape-outline' },
  { value: 'calls', label: '调用统计', icon: 'i-mdi-chart-bar' }
] as const

export type AdminApiHubTab = typeof adminApiHubTabs[number]['value']

export const adminApiHubHref = (tab: AdminApiHubTab) => `${ADMIN_API_HUB_PATH}#${tab}`

export const adminApiHubQuickActions = [
  { tab: 'governance', label: '登记接口', icon: 'i-mdi-plus-circle-outline' },
  { tab: 'calls', label: '查看调用日志', icon: 'i-mdi-history' }
] as const satisfies ReadonlyArray<{ tab: AdminApiHubTab, label: string, icon: string }>

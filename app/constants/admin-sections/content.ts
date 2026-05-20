export const ADMIN_CONTENT_PATH = '/admin/content'

export const adminContentTabs = [
  { value: 'announcements', label: '公告', icon: 'i-mdi-bullhorn-outline' },
  { value: 'notifications', label: '通知', icon: 'i-mdi-bell-outline' },
  { value: 'friend-links', label: '友情链接', icon: 'i-mdi-link-variant' }
] as const

export type AdminContentTab = typeof adminContentTabs[number]['value']

export const adminContentHref = (tab: AdminContentTab) => `${ADMIN_CONTENT_PATH}#${tab}`

export const adminContentQuickActions = [
  { tab: 'announcements', label: '发布公告', icon: 'i-mdi-bullhorn-outline' }
] as const satisfies ReadonlyArray<{ tab: AdminContentTab, label: string, icon: string }>

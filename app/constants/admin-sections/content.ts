import type { NavigationMenuItem } from '@nuxt/ui'

export const ADMIN_CONTENT_PATH = '/admin/content'

export const adminContentLinks: NavigationMenuItem[] = [
  { label: '公告', icon: 'i-mdi-bullhorn-outline', to: ADMIN_CONTENT_PATH, exact: true },
  { label: '通知', icon: 'i-mdi-bell-outline', to: `${ADMIN_CONTENT_PATH}/notifications` },
  { label: '友情链接', icon: 'i-mdi-link-variant', to: `${ADMIN_CONTENT_PATH}/friend-links` }
]

export const adminContentQuickActions = [
  { label: '发布公告', icon: 'i-mdi-bullhorn-outline', to: ADMIN_CONTENT_PATH }
]

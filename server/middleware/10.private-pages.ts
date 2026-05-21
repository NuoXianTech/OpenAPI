import { setResponseHeader } from 'h3'

// 私有页面（dashboard / 个人中心 / 管理后台 / 登录注册等）的 SSR HTML 含登录态文本，
// 必须强制 private, no-store，避免被反向代理 / Service Worker / 浏览器返回按钮缓存后串号给其他用户。
// 注意：API 路由各自按需在 handler 内设置自己的 Cache-Control（如 me.get.ts），这里只覆盖页面响应。
const PRIVATE_PAGE_PREFIXES = [
  '/user',
  '/admin',
  '/login',
  '/register',
  '/verify-email',
  '/forgot-password',
  '/reset-password'
]

export default defineEventHandler((event) => {
  const url = event.path || ''
  if (url.startsWith('/api/') || url.startsWith('/_')) return
  const path = url.split('?')[0] || ''
  const isPrivate = PRIVATE_PAGE_PREFIXES.some(prefix => path === prefix || path.startsWith(`${prefix}/`))
  if (isPrivate) {
    setResponseHeader(event, 'Cache-Control', 'private, no-store')
  }
})

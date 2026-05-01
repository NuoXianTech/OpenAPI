export default defineNuxtPlugin(async () => {
  // 客户端启动时（hydrate 后）拉一次登录态写进 useState；
  // 之后所有页面/组件用 useAuth().user 读取，不再重复请求 /api/auth/me。
  // 仅客户端：避免 SWR/payload 缓存把登录态泄露给其他用户。
  const { fetchMe } = useAuth()
  await fetchMe()
})

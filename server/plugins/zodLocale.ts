import { z } from 'zod'

// 服务端同样把 Zod 默认消息切到简体中文。readZodBody 校验失败时会把第一个 issue 的
// message 通过 createError 回传，前端 parseFetchError 会直接展示给用户，
// 这里兜底没写自定义消息的默认报错，避免漏出英文默认文案。
export default defineNitroPlugin(() => {
  z.config(z.locales.zhCN())
})

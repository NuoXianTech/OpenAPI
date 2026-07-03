import { z } from 'zod'

// 全局把 Zod 默认错误消息切到简体中文（仅客户端，服务端见 server/plugins/zod-locale.ts）。
// schema 里内联的中文消息（如 .min(3, '用户名至少 3 位')）仍然优先生效；这里只兜底那些
// 没写自定义消息的默认报错——最典型是表单字段未填(undefined)时的类型错误
// "Invalid input: expected string, received undefined"，否则会在注册/登录表单上冒英文。
export default defineNuxtPlugin(() => {
  z.config(z.locales.zhCN())
})

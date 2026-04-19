/**
 * 示例公开 API · GET /api/v1/test
 *
 * 接入说明：
 * - 业务 handler 零模板代码，ApiKey / 限流 / 配额 / 统计由 gate 中间件自动完成
 * - 仅当需要时读取 event.context.apiKey / apiMeta / apiStatsTarget
 * - 未在 admin 登记或 isEnabled=false 时，请求在到达本 handler 前被拦截
 */

import type { H3Event } from 'h3'
import { report } from '~~/server/utils/report'

export default defineEventHandler(async (event: H3Event) => {
  // event.context.apiMeta?.api          · 该接口的治理配置
  // event.context.apiMeta?.endpoint     · 命中的 endpoint（path/method/params）
  // event.context.apiKey                · 调用方带的 ApiKey（公开接口可能为 null）

  return report(event, 200, 'ok', {
    hello: 'world',
    version: event.context.apiMeta?.api.pathVersion ?? 'v1',
    serverTime: new Date().toISOString(),
  })
})

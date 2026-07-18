// 容器探活只返回 200，不查询 DB 或外部依赖，避免依赖抖动触发编排器重启进程。
export default defineEventHandler(() => ({ ok: true, ts: Date.now() }))

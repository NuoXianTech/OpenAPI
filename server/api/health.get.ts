export default defineEventHandler(() => {
  // 容器探活：只回 200，不查 DB / 外部依赖。
  // 这样 DB 抖动不会导致整个进程被编排器误判杀掉；DB 探活请另开 /api/health/db。
  return { ok: true, ts: Date.now() }
})

# API 计费规则

本文描述 `server/routes/v{N}/**` 下公开 API 的统一计费链路，适用于单实例与按本文约束部署的多实例环境。

## 数据模型

- `users.credits` 是用户余额的唯一事实来源。
- `apis.method_costs` 按 HTTP 方法保存价格，结构为 `Record<UPPER_METHOD, number>`。
- `api_credit_reservations` 是付费调用的持久状态机：`active` 表示 handler 正在执行，`pending` 表示成功响应必须结算，`dead_letter` 表示重试耗尽且积分继续冻结。可用余额为用户余额减去该用户的所有预留。
- `credit_transactions` 记录每次余额变化，并保留 `balanceAfter` 审计快照；`creditReservationId` 是 API 扣费的持久幂等键。
- 当前没有套餐、订阅、支付网关或月度额度系统。

## 请求链路

1. `defineOpenApiEventHandler` 仅在公开 API handler 执行前解析 `(pathVersion, code)`、加载 API 配置、匹配 endpoint，并计算本次 method 的有效费用。
2. `server/utils/api-guard.ts` 检查 API 状态、API Key 规则和限流。付费请求在同一事务内通过用户行锁检查可用余额、预占 API Key 积分配额并创建 `active` 预留；后续每日配额拒绝时同时释放两项预留。
3. 公开 API handler 执行业务逻辑，并返回标准 OpenAPI 响应结构。
4. handler 返回成功时，网关必须先把预留改为 `pending` 才能返回响应；失败响应则原子恢复 API Key 配额并删除预留。成功结果无法持久化时返回 `503 BILLING_UNAVAILABLE`，避免成功调用逃逸扣费。
5. `server/plugins/api-call-stats.ts` 在响应发出后记录 `api_calls`、更新 `api_call_stats`，关联调用日志并尝试立即结算。
6. `creditService.finalizeReservation` 在同一事务内扣减余额、写入 `credit_transactions`、更新 `api_calls.credits_cost` 并删除预留。事务按 `creditReservationId` 幂等；即使进程在调用日志写入前退出，后台任务也能先完成扣费，再安全补挂调用日志。
7. `server/plugins/credit-reservations-retry.ts` 每 30 秒在 Redis lease 下扫描到期的 `pending` 预留并退避重试；达到上限后进入 `dead_letter`。未配置 Redis 的单实例使用进程内 lease 回退。
8. 后台任务会释放超过 10 分钟的 `active` 预留并恢复 API Key 配额。`pending` 和 `dead_letter` 预留不会被自动释放。

## 可靠性规则

- 不要在 API handler 中扣费。handler 只表达成功或失败，扣费由插件统一处理。
- 不要直接更新 `users.credits`。所有余额变化必须走 `creditService`，或走等价的单事务实现，并同时写入审计流水。
- `credit_transactions.creditReservationId` 在非空时保持唯一，避免同一预留产生重复扣费。
- `api_credit_reservations.status` 仅允许 `active`、`pending` 与 `dead_letter`；只有 `pending` 可进入结算。
- 管理员撤回积分只能消费未预留余额；重置余额低于预留总额时必须拒绝，避免后续结算把余额扣成负数。

## 限流模型

- 未配置 Redis 时，限流器使用进程内存；计数随进程重启而清空，只适用于开发或单实例轻量部署。
- 配置 `NUXT_REDIS_URL` 后，公开 API 与身份防刷使用共享 Redis 原子计数，多实例可获得一致的限流结果。
- 多实例生产必须同时设置 `NUXT_REDIS_REQUIRED=true`。Redis 不可用时限流链路 fail-closed，避免实例退回各自内存后绕过限制。
- API 的秒、分、时、日窗口由 `rateLimitPerSecond/Minute/Hour/Day` 控制；`dailyQuota` 是按 API 统计口径执行的每日配额，不等同于 API Key 的余额或 `totalCalls`。

## 已知限制

- `creditService.refund` 为未来流程预留，当前标准 API 计费链路不会调用。
- `dead_letter` 预留目前需要运维人工确认后处理，不能直接删除，否则会无审计地释放已成功调用的费用。

## 注册赠送积分

当 `siteSettings.defaultRegisterCredits > 0` 时，`userService.activateUser` 会在用户首次激活时自动写入 `signup_bonus`。邮箱验证和 OAuth 自动注册共用同一条激活路径；后续重复激活受 `users.emailVerifiedAt IS NULL` 保护，不会重复赠送积分。

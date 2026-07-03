# API 计费规则

本文描述 `server/routes/v{N}/**` 下公开 API 在单实例生产部署中的计费链路。

## 数据模型

- `users.credits` 是用户余额的唯一事实来源。
- `apis.method_costs` 按 HTTP 方法保存价格，结构为 `Record<UPPER_METHOD, number>`。
- `credit_transactions` 记录每次余额变化，并保留 `balanceAfter` 审计快照。
- `pending_charges` 保存响应后扣费失败的重试任务，由同一个 Node 进程处理。
- 当前没有套餐、订阅、支付网关或月度额度系统。

## 请求链路

1. `server/middleware/00.api-gate.ts` 解析 `(pathVersion, code)`，加载 API 配置，匹配 endpoint，并计算本次 method 的有效费用。
2. `runApiGuard` 检查 API 状态、API Key 规则、内存限流、每日配额和用户余额。
3. 公开 API handler 执行业务逻辑，并返回标准 OpenAPI 响应结构。
4. `server/plugins/api-call-stats.ts` 在响应发出后记录 `api_calls`，并更新 `api_call_stats`。
5. 如果本次调用需要扣费，`creditService.forceCharge` 会在同一事务中扣减 `users.credits` 并插入 `credit_transactions`。由于上游工作已经发生，此处扣费是无条件的，可能把余额扣成负数；后续调用会被 api-gate 的 `balance < effectiveCost` 检查拒绝，直到用户充值。
6. 此阶段的扣费失败只应来自瞬时故障（例如数据库错误）。失败时 `pendingChargeService.enqueue` 写入一条以 `apiCallId` 为键的重试记录；余额不足不再进入重试队列。
7. `server/plugins/pending-charges-retry.ts` 在单 Node 进程内每 30 秒扫描到期的 `pending_charges`，通过 `forceCharge` 重试；成功后删除记录，失败则退避，直到进入 `dead_letter`。

## 可靠性规则

- 不要在 API handler 中扣费。handler 只表达成功或失败，扣费由插件统一处理。
- 不要直接更新 `users.credits`。所有余额变化必须走 `creditService`，或走等价的单事务实现，并同时写入审计流水。
- `credit_transactions(apiCallId, reason)` 在 `apiCallId` 存在时保持唯一，避免同一次 API 调用产生重复扣费或退款流水。
- `pending_charges.apiCallId` 保持唯一，避免重复重试任务。
- `pending_charges.status` 仅允许 `pending` 与 `dead_letter`。

## 限流模型

限流有意只使用进程内内存。项目按单个生产 Node 服务进程设计，进程重启后计数器会重置，这对当前部署模型是可接受的。

## 已知限制

- `creditService.refund` 为未来流程预留，当前标准 API 计费链路不会调用。
- `dead_letter` 扣费任务目前需要运维处理，后续可以补专用管理页。
- 当前是后付费模型，api-gate 的余额检查只具备准入意义：并发中的多个请求可能都通过 gate，并在 `forceCharge` 时把余额扣成负数。这个结果在当前模型中可接受，负数余额会阻止后续调用直到充值。如果未来需要严格预付费，应在 gate 阶段做原子预留或冻结，并在 handler 结束后退还差额。

## 注册赠送积分

当 `siteSettings.defaultRegisterCredits > 0` 时，`usersService.activateUser` 会在用户首次激活时自动写入 `signup_bonus`。邮箱验证和 OAuth 自动注册共用同一条激活路径；后续重复激活受 `users.emailVerifiedAt IS NULL` 保护，不会重复赠送积分。

# API 请求调用统计规范

适用范围：`server/routes/v{N}/**` 下所有被 [server/middleware/00.api-gate.ts](../server/middleware/00.api-gate.ts) 治理的对外 API。后台内部接口（`server/api/admin/**`、`server/api/user/**` 等）不在本规范覆盖范围内。

本文只定义“调用统计”口径，不定义扣费规则。扣费链路见 [billing/api-charging.md](./billing/api-charging.md)，对外 API 目录与注册规范见 [api-conventions.md](./api-conventions.md)。

## 1. 三类统计口径

项目里“调用日志”和“调用次数”不是同一个概念，开发、运营和对账时必须先确认自己看的口径。

| 口径 | 存储位置 | 含义 | 主要用途 |
| --- | --- | --- | --- |
| 调用日志 | `api_calls` | 单次请求明细，一行代表一次已落库调用 | 用户/管理员查看明细、排错、审计 |
| 日聚合统计 | `api_call_stats` | 按 `apiId + 本地日期` 聚合的总数、成功数、失败数 | 公开统计页、后台趋势、TOP 排行 |
| API Key 调用次数 | `api_keys.totalCalls` | 该 Key 成功通过 gate 的使用次数 | 用户 Key 列表展示、Key 使用情况 |

重点约定：

- `api_call_stats.totalCount` 统计的是已落库调用日志条数，包含成功与失败。
- `api_keys.totalCalls` 只统计成功通过 gate 的请求，不统计任何 gate 拒绝请求。
- 不要把 `api_call_stats.totalCount` 当成某个 API Key 的成功调用次数。

## 2. 统计链路

[server/plugins/apiCallStats.ts](../server/plugins/apiCallStats.ts) 通过 Nitro 生命周期钩子记录统计：

1. `request` 阶段：如果路径属于 `/v{N}/**` 治理范围，记录请求开始时间、路径、方法、IP、API Key、User-Agent、Referer、QueryString、请求大小等快照。
2. `api-gate` 阶段：命中已注册 API 且 `apis.isStatistics=true` 时，gate 将 `apiStatsTarget` 写入 `event.context`。
3. `afterResponse` 阶段：响应发出后异步写入 `api_calls` 明细，并同步 upsert `api_call_stats` 日聚合。
4. gate 通过且识别到 API Key 时，调用成功使用记录会累加 `api_keys.totalCalls`。

统计写入是 after-response 异步执行：业务响应不会等待统计落库完成。统计失败只写服务端日志，不影响本次 API 响应。

## 3. 哪些请求不计入调用日志

以下请求不写入 `api_calls`，也不会更新 `api_call_stats`：

| 场景 | 原因 |
| --- | --- |
| 非 `/v{N}/**` 路径，例如 `/api/admin/**`、`/api/user/**`、`/api/auth/**` | 不属于对外 API gate 治理范围 |
| `/v{N}/**` 但路径格式不满足 `(pathVersion, code)` | gate 无法解析 API 归属 |
| `/v{N}/**` 但 manifest 中不存在对应 `(pathVersion, code)` | 没有可归属的对外 API 代码目录 |
| manifest 存在但 DB 中未注册对应 `apis` 记录 | 没有统计目标，gate 返回 `API_NOT_REGISTERED` |
| `apis.isStatistics=false` | 管理员关闭该 API 的统计 |
| 缺失 API Key 且该接口要求 Key | 无法归属到具体 Key/用户，跳过落库 |
| API Key 无效 | 无法确认具体 Key/用户，跳过落库 |

缺失 Key 和无效 Key 特别容易误判：它们会被 gate 拒绝，但不会进入调用日志，也不会进入日聚合。这是为了避免攻击流量或客户端配置错误制造大量不可归属的噪声数据。

## 4. 哪些请求不计入调用次数

这里的“调用次数”特指 `api_keys.totalCalls`。

`api_keys.totalCalls` 只在 gate 通过、且识别到具体 API Key 时累加。任何 gate 拒绝请求都不累加 `totalCalls`，包括：

| 场景 | 是否写调用日志 | 是否累加 `api_keys.totalCalls` |
| --- | --- | --- |
| 缺失 API Key | 否 | 否 |
| API Key 无效 | 否 | 否 |
| API Key 已吊销 | 是，若能识别到 Key | 否 |
| API Key 已过期 | 是，若能识别到 Key | 否 |
| scope 不允许 | 是 | 否 |
| IP 不在白名单 | 是 | 否 |
| 触发限流 | 是 | 否 |
| API 每日配额超限 | 是 | 否 |
| API Key 累计积分配额超限 | 是 | 否 |
| 余额不足 | 是 | 否 |
| API 被禁用 | 是，若已命中统计目标 | 否 |

已识别到具体 Key 的拒绝请求会尽量写入 `api_calls`，并带上 `errorCode/errorMessage`，方便审计和排错；但它们不是“成功使用”，所以不累加 `api_keys.totalCalls`。

## 5. 成功与失败口径

默认按 HTTP 状态码判断日聚合里的成功/失败：

| 条件 | 日聚合结果 |
| --- | --- |
| `200 <= statusCode < 400` | `successCount + 1` |
| 其他状态码 | `failureCount + 1` |

业务 handler 可以通过 [server/utils/apiCallOutcome.ts](../server/utils/apiCallOutcome.ts) 显式修正统计结果：

- `markApiCallFailed(event, code, message)`：即使最终 HTTP 是 2xx，也让 `api_call_stats` 按失败计，并把 `code/message` 写入 `api_calls.errorCode/errorMessage`。
- `markApiCallSuccess(event)`：极少使用；用于 handler 抛错或返回非 2xx，但业务实际已完成且需要按成功处理的场景。

注意：`api_calls.statusCode` 始终保存真实 HTTP 状态码。`markApiCallFailed` 只修正日聚合成功/失败口径，不篡改单次调用日志里的真实状态码。

## 6. 数据字段规范

### 6.1 `api_calls` 明细

表结构定义见 [server/db/schema/api.ts](../server/db/schema/api.ts)。每条调用日志至少包含：

| 字段 | 说明 |
| --- | --- |
| `apiId` | 归属 API |
| `apiKeyId` | 归属 API Key；无法归属时为 `null` |
| `userId` | 归属用户；无法归属时为 `null` |
| `path` / `method` / `queryString` | 请求路径、方法、查询串 |
| `statusCode` | 真实 HTTP 状态码 |
| `latencyMs` | 从 request 快照到 afterResponse 的耗时 |
| `ip` / `userAgent` / `referer` | 请求来源信息 |
| `requestSize` / `responseSize` | 请求/响应大小；无法解析时为 `null` |
| `errorCode` / `errorMessage` | gate 拒绝原因或业务显式失败原因 |
| `creditsCost` | 本次实际扣除积分；免费、失败未扣或未完成回填时为 `0` |
| `createdAt` | 明细写入时间 |

写入入口统一走 [server/service/apiCallService.ts](../server/service/apiCallService.ts) 的 `addCallAndUpsertDailyStat`，禁止绕过 service 直接写表。

### 6.2 `api_call_stats` 日聚合

`api_call_stats` 按 `apiId + statDate` 唯一聚合：

| 字段 | 说明 |
| --- | --- |
| `totalCount` | 已落库调用日志总数 |
| `successCount` | 成功调用数 |
| `failureCount` | 失败调用数 |
| `statDate` | 本地日期零点，来自 `getLocalDayStart` |

日聚合与明细在同一个事务中写入：只要明细成功落库，对应日聚合就必须同步增加。

## 7. 查询与展示口径

| 页面/接口 | 数据来源 | 口径 |
| --- | --- | --- |
| 用户调用汇总 | `apiCallService.getSummaryForUser` | 按 `api_calls.userId` 过滤，基于真实 `statusCode` 汇总 |
| 用户调用日志 | `apiCallService.listLogForUser` | 按 `api_calls.userId` 过滤，可筛 API、Key、成功/失败 |
| 管理员调用日志 | `apiCallService.listForAdmin` | 全量 `api_calls`，可筛用户、API、Key、成功/失败 |
| 管理员统计汇总 | `apiCallStatsService.getSummary` | 全量 `api_call_stats` 汇总 |
| 公开统计页 | `apiCallStatsService.getPublicDashboard` | 只统计 `apis.isEnabled=true && apis.isStatistics=true` 的 API |

公开统计页的 TOP 排行按近 30 天 `api_call_stats.totalCount` 排序；趋势天数最多 30 天，缺失日期补 0。

## 8. 开发规范

- 新增对外 API 后，必须在后台注册对应 `(pathVersion, code)`；否则不会产生调用日志。
- 如不希望某 API 出现在统计中，使用 `apis.isStatistics=false`，不要在 handler 里手动跳过统计。
- handler 不要直接写 `api_calls` 或 `api_call_stats`。
- 业务失败但返回 4xx/5xx 时，不需要额外标记；默认会按失败统计。
- 业务失败但必须返回 2xx 时，必须调用 `markApiCallFailed`，否则日聚合会按成功统计。
- 统计口径变更必须同步更新本文档，并检查用户页、后台页、公开统计页三个展示入口。

## 9. 自查清单

- [ ] 是否明确区分了 `api_calls`、`api_call_stats.totalCount`、`api_keys.totalCalls`
- [ ] 缺失/无效 API Key 是否不写日志、不更新日聚合、不累加 `totalCalls`
- [ ] 已识别 Key 的 gate 拒绝请求是否写日志和日聚合，但不累加 `totalCalls`
- [ ] 成功通过 gate 的请求是否写日志、更新日聚合，并累加 `totalCalls`
- [ ] `isStatistics=false` 是否不写日志、不更新日聚合、不参与公开统计
- [ ] HTTP 2xx 但业务失败的场景是否调用 `markApiCallFailed`

# API 请求调用统计规范

适用范围：`server/routes/v{N}/**` 下所有被 [`defineOpenApiEventHandler`](../../server/utils/api-guard.ts) 治理的对外 API。后台内部接口（`server/api/admin/**`、`server/api/user/**` 等）不在本规范覆盖范围内。

本文只定义“调用统计”口径，不定义扣费规则。扣费链路见 [API 计费规则](../platform/billing-rules.md)，对外 API 目录与注册规范见 [对外接口落地规范](./public-api-conventions.md)。

## 1. 三类统计口径

项目里“调用日志”和“调用次数”不是同一个概念，开发、运营和对账时必须先确认自己看的口径。

| 口径 | 存储位置 | 含义 | 主要用途 |
| --- | --- | --- | --- |
| 调用日志 | `api_calls` | 单次请求明细，一行代表一次已落库调用 | 用户/管理员查看明细、排错、审计 |
| 日聚合统计 | `api_call_stats` | 按 `apiId + 本地日期` 聚合 `api_calls.isCounted=true` 的总数、成功数、失败数 | 公开统计页、后台趋势、TOP 排行 |
| API Key 调用次数 | `api_keys.totalCalls` | 该 Key 通过 gate 并进入 handler 的使用次数，不等同于业务成功次数 | 用户 Key 列表展示、Key 使用情况 |

重点约定：

- `api_call_stats.totalCount` 统计的是 `api_calls.isCounted=true` 的已落库调用日志条数，包含成功与失败。
- `api_keys.totalCalls` 只统计通过 gate 的请求，不统计任何 gate 拒绝请求；handler 后续返回 4xx/5xx 时仍算一次 Key 使用。
- 不要把 `api_call_stats.totalCount` 当成某个 API Key 的成功调用次数。

## 2. 统计链路

[server/plugins/api-call-stats.ts](../../server/plugins/api-call-stats.ts) 通过 Nitro 生命周期钩子记录统计：

1. `request` 阶段：如果路径属于 `/v{N}/**` 治理范围，记录请求开始时间、路径、方法、IP、API Key、User-Agent、Referer、QueryString、请求大小等快照。
2. `api-gate` 阶段：命中已注册 API 且 `apis.isStatistics=true` 时，gate 将 `apiStatsTarget` 写入 `event.context`。
3. `afterResponse` 阶段：响应发出后异步写入 `api_calls` 明细；当 `api_calls.isCounted=true` 时，同步 upsert `api_call_stats` 日聚合。
4. gate 通过且识别到 API Key 时，使用记录会累加 `api_keys.totalCalls`。

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
| `apis.isEnabled=false`（公共接口禁用） | 接口被关停期间所有调用都不写日志 |
| `apis.isOrphaned=true`（源码已被物理删除） | manifestSync 已强制 `isEnabled=false / isStatistics=false`，等价于上一行 |
| 缺失 API Key 且该接口要求 Key | 无法归属到具体 Key/用户，跳过落库 |
| API Key 无效 | 无法确认具体 Key/用户，跳过落库 |

缺失 Key 和无效 Key 特别容易误判：它们会被 gate 拒绝，但不会进入调用日志，也不会进入日聚合。这是为了避免攻击流量或客户端配置错误制造大量不可归属的噪声数据。

> 接口禁用与密钥禁用的行为差异：**接口禁用**（`apis.isEnabled=false`，对应 outcome `disabled`）直接不写任何日志；**API Key 禁用**（`apiKeys.isActive=false`，对应 outcome `disabled_api_key`）仍会写一条 `isCounted=false` 的日志。

## 4. 哪些请求不计入调用次数

这里的“调用次数”特指 `api_keys.totalCalls`。

`api_keys.totalCalls` 只在 gate 通过、且识别到具体 API Key 时累加。它表达“这个 Key 被服务接受并进入 handler 多少次”，不是业务成功次数。任何 gate 拒绝请求都不累加 `totalCalls`，包括：

| 场景 | 是否写调用日志 | 是否累加 `api_keys.totalCalls` |
| --- | --- | --- |
| 缺失 API Key | 否 | 否 |
| API Key 无效 | 否 | 否 |
| API Key 已禁用（`isActive=false`） | 是，若能识别到 Key；`isCounted=false` | 否 |
| API Key 已过期 | 是，若能识别到 Key；`isCounted=false` | 否 |
| scope 不允许 | 是；`isCounted=false` | 否 |
| IP 不在白名单 | 是；`isCounted=false` | 否 |
| 触发限流或限流服务不可用 | 是；`isCounted=false` | 否 |
| API 每日配额超限或配额服务不可用 | 是；`isCounted=false` | 否 |
| API Key 累计积分配额超限 | 是，但不更新日聚合统计 | 否 |
| 余额不足 | 是；`isCounted=false` | 否 |
| 公共接口被禁用（`isEnabled=false`） | 否（接口禁用时关闭全部日志/统计） | 否 |

已识别到具体 Key 的拒绝请求会尽量写入 `api_calls`，并带上 `errorCode/errorMessage`，方便审计和排错；但它们没有进入 handler，所以不累加 `api_keys.totalCalls`。上述守卫规则拒绝（禁用/过期 Key、scope、IP、限流、每日配额、Key 配额、余额不足及相关服务不可用）均标记 `isCounted=false`，不更新 `api_call_stats`，因此不计入聚合调用次数和失败次数。**公共接口禁用**（`apis.isEnabled=false`，gate outcome `disabled`）直接不写任何调用日志，与缺失/无效密钥同列。

## 5. 成功与失败口径

默认只对 `api_calls.isCounted=true` 的日志按 HTTP 状态码判断日聚合里的成功/失败：

| 条件 | 日聚合结果 |
| --- | --- |
| `200 <= statusCode < 400` 且没有 `errorCode` | `successCount + 1` |
| 其他状态码，或业务显式写入了 `errorCode` | `failureCount + 1` |

业务 handler 可以通过 [server/utils/api-call-outcome.ts](../../server/utils/api-call-outcome.ts) 显式修正统计结果：

- `markApiCallFailed(event, code, message)`：即使最终 HTTP 是 2xx，也让 `api_call_stats` 按失败计，并把 `code/message` 写入 `api_calls.errorCode/errorMessage`。
- `markApiCallSuccess(event)`：极少使用；用于 handler 抛错或返回非 2xx，但业务实际已完成且需要按成功处理的场景。

注意：`api_calls.statusCode` 始终保存真实 HTTP 状态码。`markApiCallFailed` 只修正日聚合成功/失败口径，不篡改单次调用日志里的真实状态码。

## 6. 数据字段规范

### 6.1 `api_calls` 明细

表结构定义见 [server/db/schema/api.ts](../../server/db/schema/api.ts)。每条调用日志至少包含：

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
| `isCounted` | 是否计入 `api_call_stats`、用户汇总、后台趋势等统计口径；`false` 表示仅保留审计日志 |
| `createdAt` | 明细写入时间 |

写入入口统一走 [server/services/api-call-service.ts](../../server/services/api-call-service.ts)：计数日志使用 `addCallAndUpsertDailyStat`，仅留审计日志使用 `addCall`，禁止绕过 service 直接写表。

### 6.2 `api_call_stats` 日聚合

`api_call_stats` 按 `apiId + statDate` 唯一聚合：

| 字段 | 说明 |
| --- | --- |
| `totalCount` | `api_calls.isCounted=true` 的已落库调用日志总数 |
| `successCount` | `api_calls.isCounted=true` 的成功调用数 |
| `failureCount` | `api_calls.isCounted=true` 的失败调用数 |
| `statDate` | 本地日期零点，来自 `getLocalDayStart` |

日聚合与计数明细在同一个事务中写入：只要 `isCounted=true` 的明细成功落库，对应日聚合就必须同步增加；`isCounted=false` 的明细只保留在 `api_calls`。

## 7. 查询与展示口径

| 页面/接口 | 数据来源 | 口径 |
| --- | --- | --- |
| 用户调用汇总 | `apiCallService.getSummaryForUser` | 按 `api_calls.userId` 过滤，只汇总 `isCounted=true` |
| 用户调用日志 | `apiCallService.listLogForUser` | 按 `api_calls.userId` 过滤；全部列表包含 `isCounted=false`，成功/失败筛选只匹配 `isCounted=true` |
| 管理员调用日志 | `apiCallService.listForAdmin` | 全量 `api_calls`；全部列表包含 `isCounted=false`，成功/失败筛选只匹配 `isCounted=true` |
| 管理员统计汇总 | `apiCallStatsService.getSummary` | 全量 `api_call_stats` 汇总 |
| 公开统计页 | `apiCallStatsService.getPublicDashboard` | 只统计 `apis.isEnabled=true && apis.isStatistics=true` 的 API |

公开统计页的 TOP 排行按近 30 天 `api_call_stats.totalCount` 排序；趋势天数最多 30 天，缺失日期补 0。

## 8. 开发规范

API 状态设置为“自动”时，公开目录使用最近 24 小时内最多 100 条
`isCounted=true` 的调用计算服务可用性：`2xx/3xx/4xx` 表示接口仍能正常响应，只有
`5xx` 服务端错误会降低可用率。可用率达到 80% 显示“正常”，否则显示“异常”；参数错误、
资源不存在等客户端或业务 4xx 不影响自动状态。没有有效样本或关闭调用统计时显示“未知”。结果缓存
30 秒，避免公开列表重复扫描调用明细。

- 新增对外 API 后，重启 dev / 重新 build 让 manifestSync 自动建行，并在后台启用对应 `(pathVersion, code)`；否则不会产生调用日志。
- 如不希望某 API 出现在统计中，使用 `apis.isStatistics=false`，不要在 handler 里手动跳过统计。
- handler 不要直接写 `api_calls` 或 `api_call_stats`。
- 业务失败但返回 4xx/5xx 时，不需要额外标记；默认会按失败统计。
- 业务失败但必须返回 2xx 时，必须调用 `markApiCallFailed`，否则日聚合会按成功统计。
- 统计口径变更必须同步更新本文档，并检查用户页、后台页、公开统计页三个展示入口。

## 9. 自查清单

- [ ] 是否明确区分了 `api_calls`、`api_call_stats.totalCount`、`api_keys.totalCalls`
- [ ] 缺失/无效 API Key 是否不写日志、不更新日聚合、不累加 `totalCalls`
- [ ] 已识别 Key 的 gate 拒绝请求是否按 `isCounted` 口径处理：一般写日志和日聚合但不累加 `totalCalls`，API Key 已过期、API Key 累计积分配额超限和余额不足写日志但 `isCounted=false`
- [ ] 成功通过 gate 的请求是否写日志、更新日聚合，并累加 `totalCalls`
- [ ] `isStatistics=false` 或 `isEnabled=false` 是否不写日志、不更新日聚合、不参与公开统计
- [ ] HTTP 2xx 但业务失败的场景是否调用 `markApiCallFailed`

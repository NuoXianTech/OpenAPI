# 接口请求扣费 · 流程与规范

适用范围：所有挂在 [server/routes/v{N}/](../../server/routes/) 下、被 [server/middleware/00.api-gate.ts](../../server/middleware/00.api-gate.ts) 治理的对外 API。后台内部接口（`server/api/admin/**`、`server/api/user/**`）不在本规范覆盖。

本文档分两半：**上半部分**讲清当前扣费链路怎么走、为什么这么设计（架构说明）；**下半部分**列出新接口接入与日常修改时**必须遵守**的规范条款（开发规范）。

---

## 一、架构说明

### 1.1 核心数据模型

#### 余额：`users.credits`

[server/db/schema/user.ts:24](../../server/db/schema/user.ts#L24) — 单一 `bigint NOT NULL DEFAULT 0` 字段，没有独立的 wallet/balance 表，也不分主余额/赠送余额。

设计取舍：MVP 阶段只有一类积分，未来若需要"赠送 vs 充值分账"再拆表，目前**禁止**在前后端任何地方假设积分分类型。

#### 计费配置：`apis.method_costs`

[server/db/schema/api.ts:72-75](../../server/db/schema/api.ts#L72-L75) — `jsonb` 字典 `Record<UPPER_METHOD, number>`，按 HTTP 方法粒度定价：

```jsonc
{ "GET": 0, "POST": 10, "PUT": 5, "DELETE": 0 }
```

- 键缺失 / 值为 0 → 该 method 免费
- 计费粒度 = `(pathVersion, code) × HTTP method`
- 不支持按子路径/endpoint 单独定价（见 §3.5 未完工项）

历史背景：提交 `e8b9fe4` 把原本 `cost_credits: integer`（整组接口统一价）重构为 `method_costs: jsonb`。**禁止**回退到统一价，所有新代码读价都必须通过 [resolveMethodCost](../../shared/config/apiGuard.ts#L76-L83)。

#### 流水：`credit_transactions`

[server/db/schema/user.ts:53-70](../../server/db/schema/user.ts#L53-L70) — 流水即账单，没有独立"账单"表。

| 字段 | 说明 |
| --- | --- |
| `amount` | 正负向（正=入账、负=出账） |
| `balanceAfter` | 写入时的余额快照，便于审计对账 |
| `reason` | 见下方 [CreditReason](../../server/service/creditService.ts#L13-L20) 枚举 |
| `apiId` / `apiCallId` | 仅 `api_charge` / `api_refund` 有值 |
| `operatorId` / `operatorName` | admin 操作时写入；用户/系统行为为 null |
| `meta` (jsonb) | 兑换码场景写入 codeId/code/batchId 等 |

`reason` 枚举：

| reason | 用途 | 是否启用 |
| --- | --- | --- |
| `api_charge` | API 调用扣费 | ✅ |
| `api_refund` | API 调用退款 | ⚠️ 保留位，当前**无任何调用点**（见 §3.5） |
| `admin_grant` / `admin_revoke` / `admin_reset` | 管理员手动调整 | ✅ |
| `redemption_code` | 兑换码充值 | ✅ |
| `signup_bonus` | 注册赠送 | ⚠️ 仅枚举与前端 label 存在，注册流程**未实际写入**（见 §3.5） |

#### 待扣费补偿队列：`pending_charges`

[server/db/schema/api.ts:205-223](../../server/db/schema/api.ts#L205-L223) — 当响应已发出但扣款事务失败时入队。`apiCallId` 唯一约束保证幂等（见 §2.5）。

#### 充值渠道：仅兑换码

[redemption_codes](../../server/db/schema/user.ts#L82-L98) + [redemption_records](../../server/db/schema/user.ts#L106-L117)。当前**不存在**任何付费渠道（无支付网关接入）、**不存在**套餐 / 月免费额度 / 折扣机制。如需新增，参见 §4 扩展规范。

---

### 1.2 完整扣费链路

```
请求进入
   │
   ▼
[1] Nitro `request` hook  ───── server/plugins/apiCallStats.ts:300-318
   │   stamp 起始时间戳 → event.context.apiStatsTracked
   ▼
[2] middleware 00.api-gate.ts ── server/middleware/00.api-gate.ts:52-130
   │   (a) 解析 (pathVersion, code)
   │   (b) apiService.loadGuardConfig(15s LRU 缓存)
   │   (c) matchEndpoint 解析 method + path
   │   (d) resolveMethodCost(api.methodCosts, method) → effectiveCost
   │   (e) runApiGuard 规则链（见下）
   │   (f) 通过 → 挂 event.context.apiBilling
   ▼
[3] runApiGuard 规则链 ─────── server/utils/apiGuard.ts:161-255
   │   [1] isEnabled
   │   [2][3] apiKey（任意 method 收费时强制）
   │   [4] rateLimit（多窗口）
   │   [5] 当日 API 配额
   │   [6] 余额预扣校验（< effectiveCost → 402 INSUFFICIENT_CREDITS）
   ▼
[4] 业务 handler 执行 ─────── server/routes/v{N}/<code>/*.ts
   │   可选：markApiCallFailed / markApiCallSuccess 覆盖判定
   ▼
[5] Nitro `afterResponse` hook ─ server/plugins/apiCallStats.ts:181-296
   │   (a) 写 api_calls + api_call_stats（事务）
   │   (b) shouldCharge() 判定
   │   (c) creditService.charge（独立事务，原子条件 UPDATE）
   │       └─ 失败 → enqueue pending_charges
   │   (d) patchCreditsCost 回填 api_calls.creditsCost
   ▼
[6] pendingChargesRetry 周期任务 ─ server/plugins/pendingChargesRetry.ts
       每 30s 扫描，退避表 30s→1m→2m→5m→10m，5 次进 dead_letter
```

**两段事务的设计取舍**：调用日志（步骤 5a）与扣费（5c）拆开成两个事务，是为了让"日志一定能写下来"，即便扣款卡住也不丢统计。代价是：扣费可能滞后于日志写入，对账时要看 `api_calls.creditsCost` + `pending_charges` 两边。**禁止**把扣费合并进日志事务。

---

### 1.3 扣费判定：`shouldCharge`

[server/utils/apiCallOutcome.ts:60-71](../../server/utils/apiCallOutcome.ts#L60-L71) — 单一判定函数，规则按顺序短路：

| # | 条件 | 结果 |
| --- | --- | --- |
| 1 | `costCredits <= 0` | 不扣 |
| 2 | `apiKeyUserId == null` | 不扣（无归属用户） |
| 3 | `forcedOutcome === 'failed'` | 不扣 |
| 4 | `forcedOutcome === 'success'` | 必扣 |
| 5 | 否则 | `200 <= statusCode < 400` 才扣 |

**默认行为足以覆盖 95% 场景**——业务 handler 抛错或返回 4xx/5xx，扣费自动跳过，不需要写任何代码。只有以下两种罕见情况才需要 `markApiCallFailed`：

1. 业务必须返回 2xx 但要跳过扣费（如"幂等已处理"）
2. 想把可读的业务码（`UPSTREAM_ERROR` 等）写入 `apiCalls.errorCode/errorMessage`（默认仅 `forcedOutcome='failed'` 才落库）

反向用例 `markApiCallSuccess` 极少使用，仅在 handler 抛错但业务实际完成时调用。

---

### 1.4 并发安全

#### 余额扣减：原子条件 UPDATE

[server/service/creditService.ts:59-72](../../server/service/creditService.ts#L59-L72) 用 `UPDATE ... WHERE credits >= amount RETURNING` 做乐观扣减：

```sql
UPDATE users
   SET credits = credits - $amount, updated_at = now()
 WHERE id = $userId AND credits >= $amount
 RETURNING id, credits;
```

- 没有 RETURNING 行 → 抛 `INSUFFICIENT_CREDITS`
- Postgres 同行 UPDATE 自动串行化（行级 MVCC），不需要 `SELECT FOR UPDATE`
- 整个扣 + 写流水包在同一事务

**禁止**用 `SELECT 余额 → 计算 → UPDATE 新值` 这种读改写模式：两个并发请求会双写覆盖，造成超扣。

#### Gate 预扣 vs 最终扣减的窗口期

Gate 在 [apiGuard.ts:229-247](../../server/utils/apiGuard.ts#L229-L247) 读 `users.credits` 做粗筛（fail-close），但 gate 通过 → handler 执行 → afterResponse 扣款之间有窗口期，**理论上余额可能在窗口期被消耗**。最终防超扣靠 `creditService.charge` 内的条件 UPDATE 兜底（窗口期内同用户并发多次调用，靠 charge 失败 → 入 `pending_charges` → 后续重试时 charge 仍失败 → 进 dead_letter）。

**这是已知的设计取舍**：余额不足在补偿队列里也无法成功，会进 dead_letter 让人工处理。不要试图在 gate 阶段做"预占额"——会让链路变得很复杂。

#### 兑换码超兑

[redemptionService.ts:261-272](../../server/service/redemptionService.ts#L261-L272) 同样的原子条件 UPDATE：

```sql
UPDATE redemption_codes
   SET used_count = used_count + 1
 WHERE id = $id AND is_enabled
   AND used_count < max_uses
   AND (expires_at IS NULL OR expires_at >= now())
 RETURNING ...;
```

兜底：`redemption_records (codeId, userId)` 唯一索引防止同一用户重复兑换同一码。

---

### 1.5 失败补偿队列

[server/service/pendingChargeService.ts](../../server/service/pendingChargeService.ts) + [server/plugins/pendingChargesRetry.ts](../../server/plugins/pendingChargesRetry.ts)

| 项 | 值 |
| --- | --- |
| 触发条件 | `creditService.charge` 抛错（非 `INSUFFICIENT_CREDITS`） |
| 入队字段 | `apiCallId` (unique) / `userId` / `apiId` / `amount` / `remark` |
| 幂等 | `onConflictDoNothing(apiCallId)`，重复入队被忽略 |
| 退避表 | 30s → 1min → 2min → 5min → 10min |
| 最大重试 | 5 次，超出转 `dead_letter` 状态需人工 |
| 扫描周期 | 每 30s |
| 多实例认领 | `claimDue` 用 `UPDATE ... WHERE id IN (SELECT FOR UPDATE SKIP LOCKED)` 原子转 `processing` 并写 60s lease；崩溃后 lease 到期可被重新认领 |
| 双扣兜底 | `credit_transactions (apiCallId, reason) WHERE apiCallId IS NOT NULL` 部分唯一索引让任何漏过认领的重复 charge 在 INSERT 时回滚整个事务 |

---

### 1.6 错误响应

| 场景 | HTTP | code | 来源 |
| --- | --- | --- | --- |
| 余额不足 | 402 | `INSUFFICIENT_CREDITS` | [shared/config/apiGuard.ts:65](../../shared/config/apiGuard.ts#L65) |
| 任意方法 > 0 但 `isApiKey=false` | 注册期校验拒绝 | — | [register.post.ts:57-62](../../server/api/admin/apis/register.post.ts#L57-L62) |
| `users.credits` 读取异常 | 402 fail-close | `INSUFFICIENT_CREDITS` | [apiGuard.ts:240-246](../../server/utils/apiGuard.ts#L240-L246) |

响应壳统一走 [openApiFail](../../server/utils/openApiResponse.ts#L52-L67)：`{ code, message, data: null, timestamp }`。

---

## 二、开发规范（强约束）

### 2.1 接入新接口：必做

新接口接入 = 写代码 + 后台登记两步，缺一不可。

#### ✅ 代码侧

- handler 路径必须落在 [server/routes/v{N}/<code>/](../../server/routes/) 下，详见 [api-conventions.md §1](../api-conventions.md#1-路径与目录约定)
- 响应**必须**通过 `openApiOk` / `openApiFail` 返回，**禁止**裸 `return { ... }`
- handler 内**不需要**手动调用任何 `creditService.*` 方法 —— 扣费由 gate + plugin 自动完成
- 失败用对应 HTTP status + 字符串 code 即可，**默认就跳过扣费**

```ts
// ✅ 正确：失败时扣费自动跳过
export default defineEventHandler(async (event) => {
  try {
    const data = await callUpstream()
    return openApiOk(event, data)
  }
  catch (err) {
    return openApiFail(event, 502, 'UPSTREAM_ERROR', '上游服务异常')
  }
})
```

```ts
// ❌ 错误：手动扣费（重复扣 + 绕过事务一致性）
export default defineEventHandler(async (event) => {
  await creditService.charge({ userId, amount: 10, ... }) // 严禁
  return openApiOk(event, await callUpstream())
})
```

#### ✅ 后台侧

[管理后台 → 接口管理 → 新增](../../app/pages/admin/apis/index.vue) → 填写 `methodCosts`：

| 场景 | 配置 |
| --- | --- |
| 全部 method 免费 | `methodCosts: {}` 或全部值为 0；`isApiKey` 可选 |
| 任意 method 收费 | `methodCosts: { POST: 10 }`；**`isApiKey` 必须为 true** |
| 不同 method 差异定价 | `methodCosts: { GET: 0, POST: 10, PUT: 5 }` |

**强约束**：`hasAnyChargedMethod(methodCosts) && !isApiKey` 在三处兜底拒绝，未来新增写入路径必须同样校验：
- [server/api/admin/apis/register.post.ts:57-62](../../server/api/admin/apis/register.post.ts#L57-L62)
- [server/api/admin/apis/update.put.ts:23-28](../../server/api/admin/apis/update.put.ts#L23-L28)
- [server/service/apiService.ts:209-221](../../server/service/apiService.ts#L209-L221)（service 层兜底）

理由：无 apiKey 无法定位扣款账户。

---

### 2.2 修改计费规则

#### 调整某个 API 的 methodCosts

走管理后台修改，**禁止**绕开后台直接写 DB。理由：后台路径会触发 `apiService.loadGuardConfig` 的 LRU 缓存失效（15s 内自然过期，写后立即生效靠 cache bust）；裸写 DB 会有最多 15s 的旧规则窗口期。

#### 新增计费维度（如端点级覆盖）

参见 §3.5 扩展方向。**禁止**在 handler 里读 DB 二次定价（绕开 gate 等于绕开余额校验）。

#### 修改 reason 枚举

- 在 [CreditReason](../../server/service/creditService.ts#L13-L20) 增加新值
- 在前端 [REASON_META](../../app/composables/user/useUserCreditsPage.ts#L25-L43) 补 label/icon
- 在 [TransactionReasonChip](../../app/components/admin/TransactionReasonChip.vue) 补色值
- **禁止**在 admin 查询接口里 hardcode reason 白名单（用枚举本身）

---

### 2.3 写入流水：必须用 `creditService`

**禁止**任何代码绕开 [creditService](../../server/service/creditService.ts#L50) 直接 `INSERT INTO credit_transactions`。理由：

1. `creditService.charge` / `adminGrant` / `refund` 等方法把 `users.credits` 与 `credit_transactions` 包在同一事务里，单独写流水会导致余额与流水不一致
2. `balanceAfter` 快照值由 service 在事务内读 RETURNING 后的余额生成，外部无法保证一致

**唯一例外**：兑换码兑换在 [redemptionService.redeem](../../server/service/redemptionService.ts#L296-L302) 里写流水，但它内部也复用了同一事务模式（增余额 + 写流水 + 写 redemption_records 原子）。新增类似场景请遵循同一模式。

---

### 2.4 业务结果显式标记：何时用 `markApiCallFailed`

详见 [server/utils/apiCallOutcome.ts](../../server/utils/apiCallOutcome.ts) 顶部注释。

| 场景 | 应该用吗 | 原因 |
| --- | --- | --- |
| 上游服务 502/超时，返回 502 | ❌ 不必 | 4xx/5xx 默认就不扣 |
| 参数校验失败，返回 400 | ❌ 不必 | 同上 |
| 业务必须返回 2xx，但本次"啥也没干"（幂等命中、空结果跳过） | ✅ 用 | 默认 2xx 会扣 |
| 返回 502 且想把 `UPSTREAM_ERROR` 写进 `apiCalls.errorCode` 供运营查 | ✅ 用 | 只有 `forcedOutcome='failed'` 才落 errorCode |

**禁止**在每个 handler 里"防御性"全部都调一遍 —— 默认规则已经足够。

---

### 2.5 数据库迁移

按用户的[长期约定](../../../../Users/nuoxian/.claude/projects/d--Project-vscode-OpenAPI/memory/feedback_no_manual_migrations.md)：改完 [server/db/schema/](../../server/db/schema/) 立刻停手，**禁止**手写 `server/db/migrations/` 下的 SQL/snapshot/journal。由用户跑 `pnpm db:generate` 生成。

涉及计费的 schema 修改尤其要小心：

- 改 `users.credits` 类型/约束 → 影响所有 charge 路径的 SQL 兼容性
- 改 `apis.method_costs` 结构 → 需要同步更新 [methodCostsSchema](../../shared/schemas/admin.ts#L103-L115) 与 [resolveMethodCost](../../shared/config/apiGuard.ts#L76-L83)
- 改 `credit_transactions` → 全文搜索 `creditTransactions` 所有读写点统一更新

---

### 2.6 前端约定

#### 余额读取

- 顶部导航栏的余额来自 [/api/auth/me](../../server/api/auth/me.get.ts#L17-L24)，**不**单独维护一个 store
- 用户中心余额页通过 [useUserCreditsPage](../../app/composables/user/useUserCreditsPage.ts) composable 读，**禁止**自己写 fetch
- 余额变更后（充值/兑换成功）需要 `await refreshNuxtData('auth-me')` 或类似机制刷新导航栏（参见现有兑换流程）

#### SSR / payload 注意

按用户的[长期约定](../../../../Users/nuoxian/.claude/projects/d--Project-vscode-OpenAPI/memory/feedback_nuxt_ssr_private_state.md)：余额、流水等 per-user 数据**禁止**用 `useState` / `useFetch` / `useAsyncData`（都会进 payload 序列化到 HTML）。走 `$fetch` + ClientOnly fallback。

---

### 2.7 PR 自查清单

接入或修改与扣费相关的代码时，PR 自查：

- [ ] handler 没有手动调 `creditService.*`
- [ ] handler 没有读 DB 二次定价
- [ ] 失败响应用 HTTP status + 字符串 code，没塞 errorCode 到 data
- [ ] 后台已配置 `methodCosts`，且任意 method > 0 时 `isApiKey=true`
- [ ] 没有手写 `server/db/migrations/` 下任何文件
- [ ] 涉及流水写入的新代码走 `creditService` 事务方法，不裸写表
- [ ] 涉及 reason 枚举的修改同步了前端 `REASON_META` 与 chip 配色
- [ ] 前端读余额 / 流水走 composable + `$fetch`，不进 payload

---

## 三、附录：现状与扩展方向

### 3.1 模块清单（速查）

| 关注点 | 文件 |
| --- | --- |
| 余额字段 | [server/db/schema/user.ts:24](../../server/db/schema/user.ts#L24) |
| 计费配置 | [server/db/schema/api.ts:72-75](../../server/db/schema/api.ts#L72-L75) |
| 流水表 | [server/db/schema/user.ts:53-70](../../server/db/schema/user.ts#L53-L70) |
| 补偿队列表 | [server/db/schema/api.ts:205-223](../../server/db/schema/api.ts#L205-L223) |
| 网关入口 | [server/middleware/00.api-gate.ts](../../server/middleware/00.api-gate.ts) |
| 规则链 | [server/utils/apiGuard.ts](../../server/utils/apiGuard.ts) |
| 扣费时机 | [server/plugins/apiCallStats.ts:181-296](../../server/plugins/apiCallStats.ts#L181-L296) |
| 扣费服务 | [server/service/creditService.ts](../../server/service/creditService.ts) |
| 补偿队列服务 | [server/service/pendingChargeService.ts](../../server/service/pendingChargeService.ts) |
| 补偿队列调度 | [server/plugins/pendingChargesRetry.ts](../../server/plugins/pendingChargesRetry.ts) |
| 结果标记 | [server/utils/apiCallOutcome.ts](../../server/utils/apiCallOutcome.ts) |
| 价格查询辅助 | [shared/config/apiGuard.ts:76-92](../../shared/config/apiGuard.ts#L76-L92) |
| Zod 校验 | [shared/schemas/admin.ts:103-115](../../shared/schemas/admin.ts#L103-L115) |
| 兑换码服务 | [server/service/redemptionService.ts](../../server/service/redemptionService.ts) |
| 用户余额页 | [app/pages/user/credits.vue](../../app/pages/user/credits.vue) |
| 管理员配置模态 | [app/components/admin/AdminApiModal.vue](../../app/components/admin/AdminApiModal.vue) |

### 3.2 关键事实速查

| 关注点 | 答案 |
| --- | --- |
| 余额存哪 | `users.credits`（bigint 单字段） |
| 计费配置存哪 | `apis.method_costs`（jsonb，`{METHOD: amount}`） |
| 计费粒度 | `(pathVersion, code) × HTTP method` |
| 扣费时机 | `afterResponse` hook（响应已发出），不是 before-handler |
| 预扣校验 | gate 阶段读 `users.credits` 粗筛（fail-close） |
| 真正扣减 | `creditService.charge` 用条件 UPDATE 防超扣 |
| 余额不足 | `402 INSUFFICIENT_CREDITS` |
| 扣费失败 | 入队 `pending_charges`，30s 周期重试，5 次进 dead_letter |
| 退款 | `creditService.refund` 存在但**当前无调用方** |
| 充值 | 仅兑换码 |
| 套餐/折扣/月免费 | **不存在** |
| signup_bonus | **仅保留位** |

### 3.3 状态码总览

| HTTP | code | 含义 |
| --- | --- | --- |
| 401 | `MISSING_API_KEY` / `INVALID_API_KEY` / `REVOKED_API_KEY` / `EXPIRED_API_KEY` | apiKey 校验失败 |
| 402 | `INSUFFICIENT_CREDITS` | 余额不足 |
| 403 | `API_NOT_REGISTERED` / `IP_NOT_ALLOWED` / `REFERER_NOT_ALLOWED` / `SCOPE_NOT_ALLOWED` | 鉴权/范围拒绝 |
| 429 | `RATE_LIMITED` / `DAILY_QUOTA_EXCEEDED` | 限流/配额超限 |
| 503 | `API_DISABLED` | 接口被管理员关闭 |

完整列表见 [shared/config/apiGuard.ts](../../shared/config/apiGuard.ts) 的 `API_GUARD_ERROR`。

---

### 3.5 已知未完工 / 待扩展项

> 以下条目是当前实现的**已知缺口**，规划相关功能时优先评估这里的内容，避免重复造轮子或踩坑。

#### (a) `creditService.refund` 接口存在但无调用方

[server/service/creditService.ts:93-122](../../server/service/creditService.ts#L93-L122) 实现完整（事务内回补余额 + 写 `api_refund` 流水），但全代码库**无任何地方调用**。

**原因**：当前扣费是 `afterResponse` 后扣（响应已发出），失败的请求根本不会扣，所以正常流程不需要退款。

**何时需要启用**：
- 接入"先扣费后异步处理"模式（如批量任务、长轮询）时
- 管理员操作"撤销某次扣费"功能时
- 上游服务事后通知失败需要补偿时

启用时注意：refund 没有幂等键，调用方需要自己保证不重复退款（建议查 `credit_transactions` 中是否已有同 `apiCallId` 的 `api_refund` 记录）。

#### (b) `signup_bonus` 保留位未启用

[CreditReason](../../server/service/creditService.ts#L19) 已有 `signup_bonus` 枚举，前端 [REASON_META](../../app/composables/user/useUserCreditsPage.ts#L42) 也有 label/icon，但 [注册流程](../../server/api/auth/register.post.ts) **不调用** `creditService` 写入。

**启用方式**（如果未来要做注册赠送）：
1. 在 `register.post.ts` 用户创建成功后调用 `creditService.adminGrant({ userId, amount, reason: 'signup_bonus', operatorId: null, operatorName: 'system' })`
2. 赠送数额从 `siteSettings` 读，而非 hardcode
3. 注意：当前 `adminGrant` 入参要求 `operatorId`，可能需要扩展 service 支持系统操作（`operatorId=null`）

**禁止**在没启用时把 `signup_bonus` 当成"已实现"展示给用户——前端 UI 现在如果显示「累计赠送 0」是真实的 0，不是 bug。

#### (c) 重试卡 dead_letter 后无 admin UI 处理

`pending_charges.status='dead_letter'` 行需要人工介入（确认余额状态、决定补扣 / 退款 / 放弃），但**当前**没有后台界面：

- 查询：admin 需要直接连 DB 看 `pending_charges WHERE status='dead_letter'`
- 处理：admin 需要写 SQL 手动操作（删除该行、调整用户余额、写 `credit_transactions` 流水）

**何时需要处理**：dead_letter 累积到运营关注 / 用户投诉时。

**扩展方向**：在 [server/api/admin/](../../server/api/admin/) 新增 `pending-charges` 路由 + 前端 `app/pages/admin/billing/pending-charges.vue` 列表页，提供"标记为已处理 / 手动补扣 / 删除"操作。所有手动改动必须经 `creditService` 写流水，**禁止**直接 `UPDATE users.credits`。

#### (d) 三级覆盖（API / endpoint / method）目前只到 method

当前只有 `(code, method)` 两级粒度。无法做到：

- 同一 `code` 下 `/v1/crypto/aes` POST 收 10 积分、`/v1/crypto/rsa` POST 收 50 积分
- 同一 endpoint 对不同 apiKey scope 不同价

**扩展方案**（如果要做）：
- 新增 `api_endpoint_costs` 表：`(api_id, path_pattern, method, cost)` 主键
- gate 阶段先查 endpoint 级，miss 再 fallback 到 `apis.method_costs`
- `resolveMethodCost` 升级为 `resolveEndpointCost(api, pathname, method)`
- 注意：endpoint 配置不能用 `apiService.loadGuardConfig` 的 15s LRU 简单缓存（条目数会爆），需要按 `apiId` 分桶
- 前端管理界面需要类似 `AdminApiModal` 但支持动态行编辑（一个 API 下 N 个端点）

**禁止**用"在 handler 里 if 路径 then 二次扣费"的方式临时实现 —— 绕过 gate 等于绕过余额校验。

#### (e) 充值渠道仅兑换码

**当前不存在**支付网关接入。如要接入：

- 新增 `payment_orders` 表（订单状态机：pending → paid → granted）
- 支付回调 webhook 后用 `creditService.adminGrant`（或新增 `payment_recharge` reason）写入
- 必须做回调幂等（按 `payment_id` 唯一索引）
- 涉及金额需要在 service 层做最小/最大充值校验、风控（连续小额、异常 IP）
- 前端在 `app/pages/user/credits.vue` 增加充值入口

#### (f) 没有套餐 / 折扣 / 月免费额度系统

**当前不存在**任何套餐/折扣机制。如要做：

- 不要直接改 `users.credits` 的语义（如把它拆成"付费 vs 赠送"两个子余额），会破坏现有 `creditService` 所有方法的不变量
- 推荐方案：新增 `user_plans` 表 + 在 gate 阶段计算 `effectiveCost` 时套折扣，**不改** `methodCosts` 配置
- 月免费额度建议用"每月初由定时任务 grant 一笔 `monthly_bonus` reason 的积分"实现，避免在 charge 路径加复杂判断

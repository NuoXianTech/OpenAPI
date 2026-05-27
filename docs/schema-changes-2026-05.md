# 数据库 Schema 重构说明（2026-05-23）

本次重构围绕 17 条需求做了系统级清理。要点速览：

| 主题 | 旧设计 | 新设计 |
| --- | --- | --- |
| 删除用户 | 软删（`users.deletedAt`） | **硬删**（DELETE） |
| 日志保留 | FK + 软删 | FK 解耦，仅保留整数快照 |
| 公共接口删除 | 软删（`apis.deletedAt`） | 文件夹删除→`isOrphaned` 标记 |
| 注册赠送积分 | 无 | `siteSettings.defaultRegisterCredits` |
| 登录日志 | 仅 `users.lastLoginAt/Ip` 单条 | 新增 `login_logs` 表完整历史 |

---

## 1. 用户删除模型

### 1.1 硬删除（DELETE users 行）

`usersService.deleteUser` 走真正的 `DELETE FROM users WHERE id = ?`，依靠外键 cascade 联动清理"账号级附属表"：

| 表 | onDelete | 用户硬删时 |
| --- | --- | --- |
| `sessions` | cascade | 全部会话清除 |
| `verification_tokens` | cascade | 全部一次性 token 清除 |
| `oauth_accounts` | cascade | 全部三方绑定清除 |
| `api_keys` | cascade | 全部密钥清除 |
| `notification_deliveries` | cascade | 用户视角的通知投递（含已读状态）清除 |
| `login_logs` | cascade | 该用户全部登录历史清除 |
| `pending_charges` | cascade | 待重试扣费队列清除 |

### 1.2 日志解耦（不绑定 users 表）

"审计型"日志表的 `userId` 列**无外键约束**（仅作为整数快照）。PostgreSQL 的 serial 序列永不复用已发放的 id，所以这个整数在全局范围内是稳定唯一的"曾经的用户 id"快照：

| 表 | `userId` 字段语义 |
| --- | --- |
| `credit_transactions` | 用户 id 快照，无 FK；用户删除后行保留 |
| `api_calls` | 用户 id 快照，无 FK；同时 `apiKeyId` / `apiKeyName` 也是快照 |
| `operation_logs` | 用户 id 快照，无 FK；`null=admin`，整数=用户 |
| `redemption_records` | 用户 id 快照，无 FK；用户删除后兑换记录保留 |

### 1.3 管理员 = `null`

`server/utils/auth.ts` 的 `ADMIN_ACTOR_ID = null` 是全项目的约定：
- `operation_logs.userId = null` → admin 操作
- `credit_transactions.operatorId = null` → admin 操作
- `redemption_codes.createdBy = null` → admin 生成
- `friend_links.createdBy / announcements.createdBy / notification_messages.senderUserId` 同理

读取时通过 `actorKind='admin'` 过滤 `userId IS NULL`，`actor`/`operatorName`/`senderActor` 等字符串字段保存了实时姓名快照（取自 `.env` 中的管理员配置）。

---

## 2. 公共接口的 Orphan 生命周期

### 2.1 关键字段

`apis.isOrphaned: boolean default false`（替代 `apis.deletedAt`，已移除）。

### 2.2 完整流程

| 触发 | 行为 |
| --- | --- |
| `server/routes/v{N}/<code>/` 被物理删除 | `manifestSync` 启动期对账：调用 `apiService.markOrphaned(id)`，强制 `isOrphaned=true / isEnabled=false / isStatistics=false` |
| Admin 试图启用 orphan 接口 | `apiService.updateApi` 和 `toggleApiField` 抛错拒绝 |
| Admin 修改 orphan 接口的 `categoryId` / 其他元数据 | **允许** |
| 文件夹同名回归且 method 集合一致 | `registerFromManifest` 自动清除 `isOrphaned`；`isEnabled/isStatistics` 保留原值 |
| 文件夹同名回归但 method 集合变化（新增/减少 `xxx.<method>.ts`） | 清除 `isOrphaned`，但**强制 `isEnabled=false / isStatistics=false`**，让 admin 主动复核 |
| Admin 调 `deleteApi`（DELETE FROM apis） | 仅当无任何 `api_calls` 引用时成功；否则 FK restrict 抛 409 |

### 2.3 历史关联表

`api_calls.apiId` 保留 FK + restrict：apis 行永不物理删除（最多被标记 orphan），FK 仅做防御性约束，正常情况下不会触发。

---

## 3. Gate Outcomes 与调用日志写入规则

### 3.1 重命名

| 旧 outcome / 错误码 | 新 outcome / 错误码 |
| --- | --- |
| `revoked_api_key` | `disabled_api_key` |
| `REVOKED_API_KEY` | `DISABLED_API_KEY` |

语义统一为"密钥被禁用"，触发条件不变（`apiKey.isActive=false` 或 `apiKey.revokedAt != null`）。

### 3.2 写入规则

`server/plugins/apiCallStats.ts` 中定义两个集合：

```ts
const DO_NOT_WRITE_LOG_OUTCOMES = new Set([
  'disabled',         // 公共接口被禁用 → 完全不写日志
  'invalid_api_key',  // API 密钥无效 → 完全不写日志
  'missing_api_key'   // 缺少 API 密钥 → 完全不写日志
])

const NON_COUNTED_REJECTION_OUTCOMES = new Set([
  'api_key_quota_exceeded',  // 密钥配额上限 → 写日志，isCounted=false
  'disabled_api_key',        // API 密钥被禁用 → 写日志，isCounted=false
  'expired_api_key',         // API 密钥到期 → 写日志，isCounted=false
  'insufficient_credits'     // 积分不足 → 写日志，isCounted=false
])
```

`isCounted=false` 的日志：写入 `api_calls`，但 **不进 `api_call_stats` 聚合**，dashboard / 用户成功失败汇总 / TOP 排行均自动排除。

---

## 4. 登录日志 `login_logs`

新表，跟随用户硬删（FK cascade）。

| 字段 | 含义 |
| --- | --- |
| `userId` | NOT NULL，FK cascade |
| `method` | `password` / `oauth_github` / `oauth_qq` |
| `success` | true / false |
| `failureReason` | `invalid_password` / `banned` / `not_active` / `oauth_user_unavailable` |
| `ip` / `userAgent` | 请求快照 |

`server/api/auth/login.post.ts` 和 `server/utils/oauthCallback.ts` 在所有"已识别用户"的登录尝试（成功 + 失败）上写日志。**未识别尝试**（用户输入的账号不存在）不写日志，避免攻击者通过日志枚举存在的用户名/邮箱。

---

## 5. 注册赠送积分

新增 `siteSettings.defaultRegisterCredits integer NOT NULL DEFAULT 0`。

`usersService.activateUser` 在首次激活时（`emailVerifiedAt IS NULL`）：
1. 设置 `isActive=true` + `emailVerifiedAt=now()`
2. 若 `defaultRegisterCredits > 0`：`credits += defaultRegisterCredits` + 写一条 `reason='signup_bonus'` 的 `credit_transactions` 流水
3. 触发 `notificationService.fanOutFutureMessagesTo(userId)`（补发广播通知）

邮箱验证流程和 OAuth 自动注册流程都经过 `activateUser`，所以两条路径都会发放默认积分（且仅首次发放，幂等）。

---

## 6. 通知系统现状

- 用户接口仅 `list / unread-count / mark-read / mark-all-read` 四种 —— **没有任何用户级删除入口**。
- Admin 软删 message → 用户视图通过 `notificationMessages.deletedAt IS NULL` 自动过滤。
- 用户硬删 → `notification_deliveries.recipientUserId` cascade，该用户全部投递（含未读 / 已读）一并清除。

---

## 7. OAuth 注册策略

`siteSettings.oauthForceBinding`：
- `false`（默认）：OAuth 无匹配用户时，按邮箱域名规则自动建号
- `true`：拒绝建号，引导用户先去登录页绑定已有账号

---

## 8. 闲置字段与未使用列表

本次重构清理 / 评估的字段：

| 字段 | 处理 |
| --- | --- |
| `users.deletedAt` | **移除**（软删模型废弃） |
| `apis.deletedAt` | **移除**（被 `isOrphaned` 取代） |
| `apis.docVersion` | **移除**（用 `docUrl` 足够） |
| `users.bannedReason` / `users.bannedUntil` | **保留**（封禁理由 UI / 自动解封功能预留） |
| `users.lastLoginUserAgent` | **保留并启用写入**（`updateLastLogin` 已补写） |
| `apiCalls.queryString` / `userAgent` / `referer` / `requestSize` / `responseSize` | **保留**（前端展示待补，已落库可审计） |
| `apiKeys.totalCalls` / `lastUsedAt` / `lastUsedIp` | **保留**（UI 待补，已落库可统计） |
| `apis.timeoutMs` | **保留**（gate 内尚未消费，预留） |
| `friendLinks.logoUrl` | **保留**（UI 图片链接） |

---

## 9. 迁移步骤

> **本次 schema 改动属于 dev 阶段重写，未保留旧数据迁移路径。生产环境若有数据需要单独评估。**

1. 用户运行 `pnpm db:generate` 重新生成 migrations 与类型 bundle
2. 用户运行 `pnpm db:migrate`（或在本地用 `pnpm dev` 触发自动迁移）应用 schema
3. `node_modules/@nuxthub/db/schema.{mjs,d.mts}` 会被 nuxt prepare 自动重建；如未自动触发，重启 dev server 即可

参考记忆条目：`不要手动写 db migrations 文件` —— 迁移文件由用户跑 `pnpm db:generate` 生成。

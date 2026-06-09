# 数据库 Schema 变更说明（2026-06-09）

## 兑换记录并入积分流水

### 背景

每次兑换码兑换，`redemptionService.redeem` 在一个事务里**同时写两条 1:1 记录**：

- `credit_transactions`（`reason='redemption_code'`，`meta={codeId,code,batchId}`）
- `redemption_records`（`codeId, userId, amount, transactionId, ip`）

两表数据高度重叠，`redemption_records` 仅 `codeId` / `ip` / `(codeId,userId)` 防重唯一索引三项不可替代。且它带 `code_id → redemption_codes ON DELETE CASCADE` 外键，与"审计型不可变日志表"的定位自相矛盾（删兑换码会连带抹掉兑换审计）。

本次将 `redemption_records` **彻底删除**，三项独有职责并入 `credit_transactions`：一次兑换从写 2 条变 1 条，消除冗余、修正审计语义不一致。

### 字段映射

| `redemption_records` 旧字段 | 合并后落点 |
| --- | --- |
| `codeId` | `credit_transactions.code_id`（新列，整数快照，无 FK） |
| `ip` | `credit_transactions.ip`（新列，`varchar(45)`） |
| `amount` | `credit_transactions.amount`（兑换为正数入账） |
| `userId` | `credit_transactions.user_id` |
| `redeemedAt` | `credit_transactions.created_at` |
| `transactionId` | 取消（流水行自身即兑换记录） |
| `(codeId,userId)` 唯一索引 | `credit_transactions_redemption_user_uq` 部分唯一索引 |

`code` / `batchId` 不再独立存列：读取时优先 `JOIN redemption_codes` 取当前值，删码后回退 `meta->>'code'` / `meta->>'batchId'` 快照。

### 防重与防超兑

- **防重复兑换**（同一用户同一码）：`credit_transactions` 上新增部分唯一索引
  `UNIQUE (code_id, user_id) WHERE reason='redemption_code' AND code_id IS NOT NULL`，
  接管原 `redemption_records` 唯一索引。`where` 子句把约束严格限定在兑换行，与既有
  `credit_transactions_api_call_reason_uq` 互不干扰。
- **防超兑**（`maxUses`）：仍由 `UPDATE redemption_codes SET used_count=used_count+1 WHERE used_count<max_uses` 原子条件递增保证，**未改动**。

并发重复兑换时，第二条 `INSERT credit_transactions` 撞唯一索引 → 事务回滚，`used_count` 递增与加积分一并撤销，与原先靠 `redemption_records` 兜底**完全等价**。

### 删码语义变化（正向）

`credit_transactions` 无 FK，删除兑换码后**对应兑换流水继续保留**（审计不可变），不再像旧 `redemption_records` 那样随码 cascade 消失。删码后管理端兑换记录仍能从 `meta` 快照显示兑换的 `code` / `batchId`。

### 受影响代码

- `server/db/schema/user.ts`：`creditTransactions` 加 `code_id` / `ip` 列 + `credit_transactions_code_idx` 与 `credit_transactions_redemption_user_uq` 索引；删 `redemptionRecords` 表。
- `server/service/redemptionService.ts`：`redeem` 写入合并（带 `codeId`/`ip`，唯一冲突兜底防重）；`listUserRedemptions` / `listRedemptions` 改查 `credit_transactions(reason='redemption_code')`；删死代码 `listCodeRedemptions`。
- `server/service/creditService.ts`：`listUserTransactions` 补 `code_id` / `code`，用户积分流水「关联」列对兑换行显示兑换码。

API 端点（`/api/user/credits/redemptions`、`/api/admin/redemption-codes/redemptions`）与前端组件返回形状保持不变，无需改动。

### 迁移

遵循 `pnpm db:generate` 生成迁移、用户手动 `pnpm db:migrate` 的约定。`db:generate` 只产 DDL（加列 / 建索引 / drop 表），不回填数据：

- **dev（默认）**：直接应用。历史 `redemption_records` 随表丢弃；历史兑换流水 `code_id` 留空但 `meta.codeId/code` 仍在，读取不受影响。新唯一索引 `WHERE code_id IS NOT NULL` 排除历史空行，不会触发唯一冲突导致迁移失败。
- **生产保数据（可选）**：在 drop 表前手动回填：
  ```sql
  UPDATE credit_transactions SET code_id = (meta->>'codeId')::int
    WHERE reason='redemption_code' AND code_id IS NULL AND meta->>'codeId' IS NOT NULL;
  UPDATE credit_transactions ct SET ip = rr.ip
    FROM redemption_records rr WHERE rr.transaction_id = ct.id AND ct.ip IS NULL;
  ```
  原 `redemption_records (codeId,userId)` 唯一 + 与流水 1:1 ⇒ 回填后 `(code_id,user_id) WHERE reason='redemption_code'` 仍唯一，建索引安全。

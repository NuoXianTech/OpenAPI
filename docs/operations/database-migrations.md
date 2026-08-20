# 数据库迁移与版本升级

Platform 的数据库结构跟随 Platform 版本发布。生产服务器不需要源码、`node_modules`、pnpm 或 Nuxt 构建环境；每个预构建产物都携带与该版本代码严格配套的迁移执行器和 SQL：

```text
.output/server/index.mjs
.output/server/migrate.mjs
.output/server/database-migrator.mjs
.output/server/db/migrations/postgresql/
```

API Service 不连接 Platform 数据库，也不执行这些迁移。

## 版本化规则

- 当前开发线已破坏性重建为唯一的 `0000`，它直接描述当前完整 Schema，不保留旧 `0001` 或兼容升级路径。
- 旧 `0.1.0`、`0.1.1` 数据库不能原地应用这条新基线；部署包含该基线的版本前，必须重建 PostgreSQL 数据库或 PGlite 数据目录，必要数据只能通过经过验证的导出/导入流程迁移。
- 这条新基线再次正式发布后即冻结。后续每个准备发布的 Schema 变更批次运行一次 `pnpm db:generate`，生成新的 `0001`、`0002` 等增量迁移，并与代码一起审查、测试和发布。
- 基线冻结后禁止删除、重命名或改写已经发布的迁移。需要修正时追加新的前向迁移。
- 尚未发布的最新迁移可以随同一开发批次重新生成；一旦进入正式 Release，就立即视为不可变历史。团队协作时应先确认该迁移没有被其他环境应用。
- 一个 Release 产物中的应用代码、迁移执行器和迁移目录是不可拆分的部署单元，不能拿其他版本的 SQL 覆盖。
- 不同基线的数据库与迁移目录不得混用；迁移执行器不是跨基线数据转换工具。

Drizzle 使用 `drizzle.__drizzle_migrations` 记录已应用迁移。执行器可以重复运行：已经完成的迁移会跳过，只应用当前产物携带的后续迁移。

## 开发流程

修改 `server/db/schema/` 后：

```bash
pnpm db:generate
pnpm test:unit
pnpm build
pnpm test:integration:built
```

先完成并审查同一批次的 Schema 设计，再生成一次迁移。只有需要查询、关联、排序、唯一性或数据库约束保证的数据才增加普通列；真正可扩展且不参与关键查询的配置、描述和快照可以放入 JSONB。不要用 JSONB 规避已经稳定的关系模型，也不要为尚未存在的状态预留字段。

生成后必须人工审查 SQL，特别检查：

- 是否意外删除列、表、索引或约束。
- 新的非空字段是否为现有数据提供默认值或分阶段回填方案。
- 大表变更是否会长时间持锁。
- PostgreSQL 与 PGlite 是否都支持所用语法。
- 已冻结基线之后，journal 中是否只追加了新条目。

构建后的集成测试会直接运行 `.output/server/migrate.mjs`，验证迁移执行器、运行依赖和 SQL 都已进入产物。

## 当前基线部署流程

当前唯一 `0000` 是破坏性重建基线，不支持从旧 `0.1.0`、`0.1.1` 数据库原地升级。

1. 停止所有 Platform 实例并备份旧 PostgreSQL 数据库或完整 PGlite 数据目录。
2. 如需保留业务数据，先完成并验证独立的数据导出；不要把旧 Drizzle 迁移记录复制到新数据库。
3. 创建空 PostgreSQL 数据库，或清空并重新创建 Platform 使用的 PGlite 数据目录。
4. 使用目标版本产物显式执行 `migrate.mjs`，确认只应用唯一的 `0000`。
5. 启动 Platform，完成管理员初始化；需要恢复的数据通过经过验证的导入流程写入新 Schema。
6. 验证 `/api/ready`、登录、管理后台、活动 Routing Revision 和公开 Route。

新基线正式发布后的普通升级恢复为追加迁移模式：保留 `0000`，只执行目标产物新增的 `0001`、`0002` 等迁移。

执行器会在修改数据库前输出 Release 版本、脱敏后的目标地址和迁移集合；任何一项与预期不符都应立即终止发布。

上传 `.output` 的部署方式：

```bash
NODE_ENV=production node .output/server/migrate.mjs
NODE_ENV=production node .output/server/index.mjs
```

Docker Compose 部署方式：

```bash
docker compose pull openapi-platform
docker compose stop openapi-platform
docker compose run --rm --no-deps openapi-platform node server/migrate.mjs
docker compose up -d openapi-platform
```

Compose 的一次性迁移容器会复用同一组数据库环境变量和 PGlite Volume。上例使用短维护窗口作为安全默认值；确认 PostgreSQL 迁移向后兼容后才可以省略停止步骤并采用滚动替换。生产环境应固定版本标签或镜像 digest，不能依赖迁移期间发生变化的浮动镜像。

## 自动迁移

Platform 启动时仍默认执行同一套迁移，作为单实例部署和意外漏跑的安全保障。显式迁移后再次启动是安全的，只会完成一次幂等检查。

`DB_AUTO_MIGRATE=false` 只关闭启动插件的自动迁移，不会阻止显式执行 `migrate.mjs`。该开关只用于已经显式完成迁移的受控维护流程或数据库恢复，不建议永久关闭。否则部署了需要新 Schema 的应用代码后，漏跑迁移会直接导致启动或请求失败。

PostgreSQL 使用 advisory lock 串行化迁移，即使多个 Platform 实例同时启动，也只有一个实例实际应用变更。迁移锁不能解决新旧应用同时运行时的 Schema 兼容问题，因此多实例发布仍应先执行显式迁移，并采用向后兼容的变更。

PGlite 只允许一个 Platform 进程访问同一数据目录。迁移和备份前必须停止该进程。

## 兼容与回滚

数据库迁移是前向执行，不提供自动 Down Migration。回滚旧应用并不会回滚数据库结构。

- 可兼容变更优先采用 expand/contract：先新增可选结构，再发布使用新结构的代码，最后在后续版本删除旧结构。
- 删除列、改变数据含义、批量重写数据等破坏性迁移必须安排维护窗口，并在 Release Notes 写明恢复方案。
- 如果新 Schema 仍兼容旧应用，可以只回滚应用产物。
- 如果不兼容，应以前向修复为首选；必须恢复数据库时，停止所有 Platform 写入并使用发布前备份。

可以用以下查询核对已应用记录：

```sql
SELECT id, hash, created_at
FROM drizzle.__drizzle_migrations
ORDER BY created_at;
```

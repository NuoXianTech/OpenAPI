# OpenAPI Platform 发布流程

本文说明 `openapi-platform` 的版本、Git Tag、GitHub Release、GHCR 镜像和生产部署流程。`openapi-service` 使用独立仓库、版本和发布流水线；日常可独立发布，首个 `0.1.0` 按同名版本协同发布。

## 1. 发布产物

Platform 不发布 npm 包。正式部署物包括：

- GitHub Release 中的预构建 Node Server 产物。
- GHCR 中的 amd64/arm64 容器镜像。

构建必须在 Linux CI 或开发机完成。生产服务器不执行 `pnpm install`、Nuxt build 或 Docker build。

## 2. 发布通道

| Git 事件 | GitHub Release | GHCR 镜像 | 用途 |
| --- | --- | --- | --- |
| 推送到 `main` | 不创建 | `latest`、`latest-amd64`、`latest-arm64` | 开发主线 |
| 推送 `vX.Y.Z` | 正式 Release | `X.Y.Z` 多架构与架构标签 | 正式生产版本 |
| 推送 `vX.Y.Z-rc.N` | Prerelease | 对应预发布标签 | 发布候选版本 |

生产环境应固定版本号或镜像 digest，不长期依赖会变化的 `latest`。

## 3. 版本规则

项目使用 [Semantic Versioning](https://semver.org/)：

| 变更 | 版本选择 |
| --- | --- |
| 不兼容的公开行为、数据库或运行配置变化 | major |
| 向后兼容的新功能 | minor |
| 向后兼容的修复 | patch |
| 发布候选 | `-rc.N` |

首个正式公开版本为 `0.1.0`。在 `1.0.0` 之前，minor 版本可以包含明确记录的不兼容变化，但仍必须提供数据库、配置和回滚说明。

Git Tag 必须：

- 使用 `vX.Y.Z` 或 `vX.Y.Z-rc.N`。
- 去掉 `v` 后与 `package.json` 中的版本一致。
- 指向已经合并到远端 `main` 的提交。
- 发布后不可移动或重复使用。

## 4. 发布前门禁

1. 确认 [版本与支持范围](../architecture/release-scope.md) 中适用于目标版本的要求已经完成。
2. 审查数据库 Schema 和迁移；已经发布的 journal、SQL 和 snapshot 只能保留，新 Schema 必须追加迁移。
3. 为 PostgreSQL 或 PGlite 创建可恢复备份。
4. 核对运行时变量、密钥和 Service Token 维护计划；`0.1.0` 不支持双 Token 在线轮换。
5. 确认同名 `openapi-service` Tag 已经发布。Platform 版本工作流默认检出同名 Service Tag；需要验证其他兼容版本时，将 Repository Variable `OPENAPI_SERVICE_REF` 设为不可变 Tag 或 Commit。
6. 完成质量门禁：

   ```bash
   pnpm install --frozen-lockfile
   pnpm lint
   pnpm typecheck
   pnpm check:dead-code
   pnpm test:unit
   pnpm build
   pnpm test:integration:built
   ```

7. 确认构建后集成测试已经实际执行 `.output/server/migrate.mjs`。
8. 执行 [Platform 与 Service 集成测试](./service-integration-testing.md)。
9. 按 [生产就绪清单](./production-readiness.md) 和[数据库迁移与版本升级](./database-migrations.md)完成备份、故障和回滚准备。

`0.1.0` 的 `0000` 是正式迁移链起点。从正式 `0.1.0` 升级时应用当前 Release 新增的迁移；更早的实验数据库必须先完成经验证的数据导入或使用新数据库。

## 5. 准备 Release PR

从最新远端 `main` 创建发布分支：

```bash
git switch main
git fetch origin
git merge --ff-only origin/main
git switch -c release/v0.1.0
```

更新：

- `package.json` 版本。
- 锁文件中的根包版本（如果存在）。
- Release Notes 草稿。
- 数据库、运行配置和回滚说明。

提交并创建 Pull Request：

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(release): prepare v0.1.0"
git push -u origin release/v0.1.0
```

Release PR 必须通过全部 CI，且只能以可审计方式合并到 `main`。

## 6. 创建标签

Release PR 合并后重新同步本地 `main`：

```bash
git switch main
git fetch origin
git merge --ff-only origin/main
git rev-list --left-right --count HEAD...origin/main
```

最后一条命令必须输出 `0 0`。确认版本：

```bash
node -p "require('./package.json').version"
```

创建并推送带注释标签：

```bash
git tag -a v0.1.0 -m "OpenAPI Platform v0.1.0"
git push origin v0.1.0
```

不要在标签创建后修改版本文件或移动标签。需要修复时发布新的 patch 版本。

## 7. CI 发布要求

版本标签工作流应：

1. 检查 Tag 与 `package.json` 版本一致。
2. 安装锁定依赖。
3. 执行 lint、typecheck、死代码检查、测试和 build。
4. 打包完整 `.output`。
5. 构建非 root amd64/arm64 镜像。
6. 扫描依赖漏洞和 Secret。
7. 创建 GitHub Release 和校验和。
8. 发布 GHCR 多架构镜像。

任何步骤失败都不得产生可标记为正式的部分产物。

## 8. 生产部署

部署镜像示例：

```bash
docker pull ghcr.io/nuoxiantech/openapi-platform:0.1.0
docker compose up -d --no-deps openapi-platform
```

或部署完整预构建 `.output`：

```bash
NODE_ENV=production node .output/server/index.mjs
```

发布后验证：

- `/api/health`
- `/api/ready`
- 登录和管理后台。
- 活动 Routing Revision。
- Internal 与 External Route。
- API Key、积分、调用明细。
- Service 发现和配置状态。

## 9. 回滚

- Platform 代码问题：恢复上一镜像或上一 `.output`。
- 路由配置问题：激活上一 Routing Revision。
- Service 问题：只回滚 Service 镜像。
- 数据库问题：按发布前备份和迁移说明处理。

应用镜像回滚不会自动回滚数据库。数据库迁移不可逆时，Release Notes 必须给出前向修复或恢复方案。

## 10. 发布后检查

按 [生产运行手册](./production-runbook.md) 观察：

- 错误率和响应时间。
- 积分预留与结算。
- 调用日志写入。
- 数据库和 Redis 就绪状态。
- Service Target 健康与配置漂移。

确认稳定后保留构建日志、镜像 digest、数据库备份标识和 Release Notes，形成可审计发布记录。

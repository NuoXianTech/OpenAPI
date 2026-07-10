# VPS 部署指南

本项目推荐按单个 Node/Nitro 进程部署。数据库可选 PostgreSQL 或 PGlite：PostgreSQL 更适合常规生产和成熟备份，PGlite 更适合轻量、自包含、单进程部署。

发布前先完成 [生产就绪清单](./production-readiness.md)，运行时变量按 [运行时配置](./runtime-config.md) 准备。

## 本地或 CI 构建

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test:run
pnpm build
```

构建命令会生成 `.output/server/index.mjs`。生产启动入口使用 Nuxt/Nitro 官方 Node server 入口，不再通过自定义 `start.mjs` 包装应用启动。

不要在资源较小的 VPS 上执行 `pnpm build`。Nuxt/Nitro 生产构建可能短时间占用数 GB 内存，推荐在本地工作站或 CI 构建后上传 `.output`。

## 上传文件

将整个 `.output` 目录上传到服务器。构建产物中包含 `.output/server/db/migrations/postgresql`，生产入口为：

```bash
NODE_ENV=production node .output/server/index.mjs
```

## 服务器环境变量

在服务器面板或进程管理器中配置以下变量：

```bash
NITRO_PORT=3000
NITRO_HOST=127.0.0.1
NODE_ENV=production
TZ=Asia/Shanghai

# PostgreSQL 推荐配置：
DATABASE_URL=postgresql://user:password@127.0.0.1:5432/openapi

# PGlite 轻量配置二选一：
# DATABASE_DRIVER=pglite
# PGLITE_DATA_DIR=/var/lib/openapi/pglite

NUXT_AUTH_SECRET=change-me
NUXT_AUTH_API_KEY_SECRET=change-me

# Redis 分布式限流（推荐正式生产启用）
NUXT_REDIS_URL=redis://127.0.0.1:6379
NUXT_REDIS_REQUIRED=true
```

生产环境没有 `DATABASE_URL` 时，必须显式设置 `DATABASE_DRIVER=pglite`。这样可以避免 PostgreSQL 连接串漏配时，服务静默创建一个新的本地数据库。使用 PGlite 时，`PGLITE_DATA_DIR` 是生产数据目录，必须纳入服务器备份。

生产密钥可用以下命令生成：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Redis 应仅监听本机或私有网络，并启用认证或 TLS。当前 Redis 数据均带 TTL，主要承载限流计数；建议使用 `maxmemory-policy noeviction` 并监控内存，避免关键限流 key 被内存策略提前淘汰。Redis 未配置时应用继续使用单进程内存限流；正式生产需要 Redis 保护时设置 `NUXT_REDIS_REQUIRED=true`，连接失败会阻止服务在无保护状态下启动。

## 启动

直接启动应用进程：

```bash
NODE_ENV=production node .output/server/index.mjs
```

启动插件会在 Nitro 接受请求前运行 Drizzle 迁移。迁移执行器根据运行时配置连接 PostgreSQL 或 PGlite，并使用 Drizzle 的 `drizzle.__drizzle_migrations` 表，因此已经应用过的迁移会自动跳过。维护窗口需要临时禁止自动迁移时，可设置 `DB_AUTO_MIGRATE=false`。

发布含账号、OAuth、通知、积分或日志 schema 变更的版本前，先生成并随版本发布数据库迁移。当前账号模型要求管理员和普通用户共用 `users` 表，并通过 `users.role` 区分权限。

## 进程管理建议

PM2 是最简单的选择：

```bash
cd .output
NODE_ENV=production pm2 start server/index.mjs --name openapi --update-env
pm2 save
```

发布新版本时：

```bash
cd .output
pm2 restart openapi --update-env
```

建议在 Node 进程前放置 Nginx，并反向代理到 `127.0.0.1:3000`。

不要为同一个 PGlite 数据目录启动多个 Node 进程。当前应用的限流、后台任务和迁移执行策略也按单进程设计；需要横向扩展时应先切换 PostgreSQL，并重新设计进程间状态。

## 发布后检查

```bash
curl -fsS http://127.0.0.1:3000/api/health
curl -fsS http://127.0.0.1:3000/api/ready
curl -fsS http://127.0.0.1:3000/api/list
pm2 logs openapi --lines 80
```

确认统一登录页、管理员后台、用户后台、公开 API 调用、调用日志、积分流水和统计均可用后，再按 [生产运行手册](./production-runbook.md) 观察日志和关键表，最后把发布标记为完成。

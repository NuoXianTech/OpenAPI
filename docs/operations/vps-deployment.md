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

不要在资源较小的 VPS 上执行 `pnpm build`。Nuxt/Nitro 生产构建可能短时间占用数 GB 内存，推荐在 Linux CI 或项目提供的 Docker 构建阶段完成构建。

## 部署入口与目录

Nuxt 官方将完整 `.output` 定义为部署单元，生成目录不应手工修改。它不是普通源码项目：`.output/server/package.json` 只描述运行依赖，默认没有 `scripts`。

- 面板工作目录是项目源码根目录：使用 `pnpm start`。
- 面板工作目录是 `.output`：使用 `node server/index.mjs`。
- 面板工作目录是 `.output/server`：使用 `node index.mjs`，不要选择“从 package.json scripts 启动”。

必须上传整个 `.output`，包括隐藏的 `.output/server/node_modules/.nitro`。不要只上传 `server`，也不要使用会忽略隐藏目录或破坏符号链接的压缩工具。Windows 构建产物含 Junction，跨系统上传容易出现 `Cannot find module 'entities/decode'`；生产优先在 Linux CI 或 Docker 内构建。

## Docker 部署（推荐）

GitHub Actions 使用仓库根目录的 `Dockerfile` 构建完整 Nitro 产物，分别发布带标签的 amd64/arm64 镜像，再生成自动匹配服务器架构的多架构镜像。VPS 只下载和运行已经构建好的镜像，不会执行 `pnpm install` 或 `pnpm build`，因此适合小内存服务器：

```bash
docker pull ghcr.io/nuoxiantech/openapi:latest
docker run -d --name openapi --restart unless-stopped \
  -p 3000:3000 --env-file .env \
  -v openapi-data:/app/.data \
  ghcr.io/nuoxiantech/openapi:latest
```

仓库也提供直接引用 GHCR 镜像的 `compose.yml`：

```bash
# 服务器只需准备 compose.yml 和 .env，无需下载源码
docker compose pull
docker compose up -d
```

`main` 分支发布 `latest`。版本镜像只由符合 `v*.*.*` 格式的 Git 标签触发发布，例如 Git 标签 `v1.2.3` 会生成自动选择架构的 `1.2.3`，以及显式架构标签 `1.2.3-amd64`、`1.2.3-arm64`。`main` 分支对应发布 `latest`、`latest-amd64`、`latest-arm64`。镜像标签按容器生态惯例不保留 Git 标签的 `v` 前缀；不要创建不带 `v` 的 Git 标签。生产环境建议固定版本标签，升级时修改镜像版本后重新执行上述两个 Compose 命令。若 GHCR 包不是公开的，需要先用具有 `read:packages` 权限的 GitHub PAT 登录：

```bash
echo "$GHCR_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USER --password-stdin
```

镜像已配置直接执行 `node server/index.mjs`，不依赖生成 `package.json` 中的 scripts。生产数据库和 Redis 地址仍通过运行时环境变量注入；使用 PGlite 时必须保留 `/app/.data` 数据卷。

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
NUXT_API_KEY_SECRET=change-me

# 单层本机 Nginx 示例：
NUXT_PROXY_SOURCE=x_forwarded_for
NUXT_PROXY_TRUSTED_CIDRS=127.0.0.1/32,::1/128
NUXT_PROXY_FORWARDED_HOPS=1

# Redis 分布式限流与公开短缓存（推荐正式生产启用）
NUXT_REDIS_URL=redis://127.0.0.1:6379
NUXT_REDIS_REQUIRED=true
```

生产环境没有 `DATABASE_URL` 时，必须显式设置 `DATABASE_DRIVER=pglite`。这样可以避免 PostgreSQL 连接串漏配时，服务静默创建一个新的本地数据库。使用 PGlite 时，`PGLITE_DATA_DIR` 是生产数据目录，必须纳入服务器备份。首次创建管理员时，服务端日志只会输出一次随机初始密码；应立即登录并完成资料和密码初始化。

生产密钥可用以下命令生成：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Redis 应仅监听本机或私有网络，并启用认证或 TLS。限流计数、业务缓存和分布式租约均有 TTL，少量缓存版本 key 持久存在；建议使用 `maxmemory-policy noeviction` 并监控内存、命中率、淘汰数与命令延迟，避免关键限流或租约 key 被提前淘汰。Redis 未配置时应用继续使用单进程内存限流、短缓存和本地任务互斥；多实例生产必须设置 `NUXT_REDIS_REQUIRED=true`。缓存命令故障仍会安全回源数据库。

## 启动

直接启动应用进程：

```bash
NODE_ENV=production node .output/server/index.mjs
```

启动插件会在 Nitro 接受请求前运行 Drizzle 迁移。迁移执行器根据运行时配置连接 PostgreSQL 或 PGlite，并使用 Drizzle 的 `drizzle.__drizzle_migrations` 表，因此已经应用过的迁移会自动跳过。维护窗口需要临时禁止自动迁移时，可设置 `DB_AUTO_MIGRATE=false`。

发布含账号、OAuth、通知、积分或日志 schema 变更的版本前，先生成并随版本发布数据库迁移。当前账号模型要求管理员和用户共用 `users` 表，并通过 `users.role` 区分权限。

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

不要为同一个 PGlite 数据目录启动多个 Node 进程。需要横向扩展时必须切换 PostgreSQL，配置共享 Redis，并设置 `NUXT_REDIS_REQUIRED=true`。限流、缓存和扣费补偿扫描由 Redis 协调；Manifest 注册依靠数据库唯一约束保持幂等，PostgreSQL 迁移由 advisory lock 串行化。

## 发布后检查

```bash
curl -fsS http://127.0.0.1:3000/api/health
curl -fsS http://127.0.0.1:3000/api/ready
curl -fsS http://127.0.0.1:3000/api/catalog
pm2 logs openapi --lines 80
```

确认统一登录页、管理员后台、用户后台、公开 API 调用、调用日志、积分流水和统计均可用后，再按 [生产运行手册](./production-runbook.md) 观察日志和关键表，最后把发布标记为完成。

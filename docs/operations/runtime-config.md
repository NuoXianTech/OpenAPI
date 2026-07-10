# 运行时配置

本项目按 Nuxt 官方 runtimeConfig 范式管理生产配置。生产密钥只允许在运行时通过环境变量注入，不允许写入源码、文档、镜像层或构建产物。

## 基本原则

- `nuxt.config.ts` 中的私有配置默认值保持空字符串。
- 生产环境使用 `NUXT_AUTH_*`、`DATABASE_URL` / `DATABASE_DRIVER`、`NITRO_*` 等变量覆盖。
- 不在 `nuxt.config.ts` 默认值中读取异名 `process.env`，避免构建时把密钥烤进 `.output`。
- `.env.example` 只能放示例值；真实生产值配置在服务器面板、PM2 ecosystem、容器 secret 或 CI/CD secret 中。
- 修改配置后重启 Node/Nitro 进程，确保运行时读取新值。

## 必填变量

| 变量 | 生产要求 | 说明 |
| --- | --- | --- |
| `DATABASE_URL` 或 `DATABASE_DRIVER=pglite` | 必填其一 | PostgreSQL 连接串；或显式选择 PGlite 文件数据库 |
| `NUXT_AUTH_SECRET` | 必填 | access JWT、邮箱验证、一次性 token 与 OAuth state 共用的 HS256/HMAC 签名密钥，缺失时鉴权应 fail-closed |
| `NUXT_AUTH_API_KEY_SECRET` | 必填 | API Key 相关服务端密钥 |

## 推荐变量

| 变量 | 推荐值 | 说明 |
| --- | --- | --- |
| `NITRO_HOST` | `127.0.0.1` | VPS + Nginx 反向代理时只监听本机 |
| `NITRO_PORT` | `3000` | Nitro 服务端口 |
| `NODE_ENV` | `production` | 让 Nuxt、Vue Router 和相关依赖使用生产分支，减少开发警告和日志噪声 |
| `TZ` | `Asia/Shanghai` | 统一日志、统计和运维时间 |
| `DATABASE_POOL_SIZE` | `10` | `postgres-js` 连接池上限，启动迁移会单独使用 `max=1` 的连接 |
| `DATABASE_DRIVER` | 留空或 `pglite` | 留空时有 `DATABASE_URL` 使用 PostgreSQL；生产无 PostgreSQL 时必须显式设为 `pglite` |
| `PGLITE_DATA_DIR` | `.data/pglite` | PGlite 数据目录；生产使用 PGlite 时必须纳入备份 |
| `DB_AUTO_MIGRATE` | 留空 | 默认启动时自动迁移；设置为 `false` 可临时跳过启动迁移 |
| `MIGRATIONS_DIR` | 留空 | 仅迁移目录不在默认位置时设置；常规生产启动会读取 `.output/server/db/migrations/postgresql` |
| `NUXT_REDIS_URL` | 留空 | Redis 连接地址；配置后启用共享原子限流和公开短缓存 |
| `NUXT_REDIS_KEY_PREFIX` | `openapi:` | Redis key 命名空间；同一 Redis 服务部署多个环境时必须区分 |
| `NUXT_REDIS_CONNECT_TIMEOUT_MS` | `2000` | Redis 首次连接超时毫秒数 |
| `NUXT_REDIS_REQUIRED` | `false` | `true` 时限流或分布式协调所需 Redis 缺失/不可用会 fail-closed；不改变公开缓存的数据库回源策略 |

`.env.example` 为直接启动和本地调试保留 `NITRO_HOST=0.0.0.0`。生产如果前面有 Nginx、Caddy 或面板反向代理，应覆盖为 `127.0.0.1`，避免 Nitro 直接暴露到公网。

Redis 当前用于公开 API 限流、登录/注册/密码重置/OAuth 身份防刷，公开统计与内容短缓存，以及扣费补偿扫描、启动期 API Manifest 同步的分布式租约。限流 key 使用 HMAC 摘要，不会把邮箱、账号或 IP 明文写入 Redis；站点 SMTP、OAuth、Turnstile 密钥、用户私有响应、积分与调用日志不会进入共享缓存。

缓存采用 cache-aside、TTL 抖动、进程内请求合并和 Redis 短锁；管理端写入后立即删除固定缓存或递增版本。Redis 未配置或缓存命令失败时自动回源数据库，不会让公开页面变成 503。后台协调采用带 token 校验和自动续租的 Redis lease；可选模式故障时回退当前进程互斥，强制模式则跳过任务或阻止启动，避免多实例重复调度。

单实例开发可以不配置 Redis。多 Node 实例生产必须使用 PostgreSQL，并同时配置 `NUXT_REDIS_URL` 与 `NUXT_REDIS_REQUIRED=true`；PGlite 数据目录只允许一个 Node 进程。PostgreSQL 迁移另有数据库 advisory lock，即使多个实例同时启动也会串行执行。

管理员账号与普通用户共用 `users` 表，通过 `users.role='admin'` 区分，并统一从 `/login` 登录。启动时如果不存在任何管理员账号，服务端会自动创建用户名为 `admin`、邮箱为 `admin@openapi.com` 的管理员，并将随机密码输出到控制台。

首次登录后，如果管理员仍使用初始用户名或邮箱，系统会显示一次初始化弹窗，用于确认用户名、邮箱并强制设置新密码。后续用户名不再作为常规资料项修改，以保证登录日志、操作日志和审计链路稳定。

发布前必须基于当前 Drizzle schema 生成数据库迁移。构建时迁移目录会复制到 `.output/server/db/migrations/postgresql`，生产 Node 进程启动时自动应用；`pnpm db:migrate` 仅作为手动修复或演练入口。PGlite 使用同一套 PostgreSQL 方言迁移。

数据库建议：

- PostgreSQL 适合常规生产、远程数据库、成熟备份和未来扩展。
- PGlite 适合单进程、低运维成本、自包含的小型部署；它不是多实例共享数据库，使用时备份 `PGLITE_DATA_DIR`。
- 生产环境如果没有 `DATABASE_URL`，必须显式设置 `DATABASE_DRIVER=pglite`，避免漏配时静默创建新库。

## 密钥生成

每个密钥单独生成，不要和其他系统复用：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

生产密钥最少 32 bytes 随机值。`NUXT_AUTH_SECRET` 泄露后立即轮换，并观察登录、邮箱验证与 OAuth 相关异常；`NUXT_AUTH_API_KEY_SECRET` 泄露后立即轮换，并评估 API Key 相关影响。

## PM2 示例

```bash
cd .output
NITRO_HOST=127.0.0.1 \
NITRO_PORT=3000 \
NODE_ENV=production \
TZ=Asia/Shanghai \
DATABASE_URL='postgresql://user:password@127.0.0.1:5432/openapi' \
NUXT_REDIS_URL='redis://127.0.0.1:6379' \
NUXT_REDIS_REQUIRED=true \
NUXT_AUTH_SECRET='replace-with-random-hex' \
NUXT_AUTH_API_KEY_SECRET='replace-with-random-hex' \
pm2 start server/index.mjs --name openapi --update-env
```

PGlite 生产示例：

```bash
cd .output
NITRO_HOST=127.0.0.1 \
NITRO_PORT=3000 \
NODE_ENV=production \
TZ=Asia/Shanghai \
DATABASE_DRIVER=pglite \
PGLITE_DATA_DIR=/var/lib/openapi/pglite \
NUXT_AUTH_SECRET='replace-with-random-hex' \
NUXT_AUTH_API_KEY_SECRET='replace-with-random-hex' \
pm2 start server/index.mjs --name openapi --update-env
```

## 风险清单

| 风险 | 处理方式 |
| --- | --- |
| 构建机 `.env` 泄露到产物 | 不在 runtimeConfig 默认值读取异名 `process.env` |
| 多环境共用密钥 | 每个环境独立生成并独立轮换 |
| 生产监听公网端口 | `NITRO_HOST=127.0.0.1`，由 Nginx 代理公网流量 |
| 数据库迁移误连 | PostgreSQL 发布前确认 `DATABASE_URL` 的主机、库名和用户；PGlite 发布前确认 `PGLITE_DATA_DIR` |
| 自动迁移误执行 | 维护窗口可临时设置 `DB_AUTO_MIGRATE=false`，手动确认后再恢复默认 |
| Redis 故障后限流失效 | 正式生产设置 `NUXT_REDIS_REQUIRED=true`，并监控 `/api/ready` |
| Redis 故障后后台任务重复 | 多实例必须设置 `NUXT_REDIS_REQUIRED=true`；租约不可用时任务 fail-closed |
| Redis 缓存命中率下降 | 检查 Redis 延迟、内存和淘汰统计；应用会回源数据库，但数据库负载会升高 |
| 配置变更未生效 | 使用 `pm2 restart openapi --update-env` 或等价重启命令 |

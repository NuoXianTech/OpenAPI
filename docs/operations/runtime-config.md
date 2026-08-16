# 运行时配置

本项目按 Nuxt 官方 runtimeConfig 范式管理生产配置。生产密钥只允许在运行时通过环境变量注入，不允许写入源码、文档、镜像层或构建产物。

## 基本原则

- `nuxt.config.ts` 中的私有配置默认值保持空字符串。
- 生产环境使用 `NUXT_AUTH_*`、`DATABASE_URL` / `DATABASE_DRIVER`、`NITRO_*` 等变量覆盖。
- 不在 `nuxt.config.ts` 默认值中读取异名 `process.env`，避免构建时把密钥烤进 `.output`。
- `.env.example` 只能放示例值；真实生产值配置在服务器面板、PM2 ecosystem、容器 secret 或 CI/CD secret 中。
- 修改 Platform 部署配置后只重启 Node/Nitro Platform 进程；修改 API Service 的监听、Token、目录或网络配置后只重启 API Service。Service 声明的模块开关、Cookie、数据库授权密钥和算法列表由后台热更新，不要求重启。两个进程不能因为统一使用 Node.js 而共用环境变量命名空间。

`.env.example` 只保留首次正常启动需要选择或填写的变量。监听端口、连接池、迁移开关、Redis 高级选项和可信代理等覆盖项继续受支持，但只在本页说明，不把每个可调参数都塞进模板。启动阶段会集中校验必填配置；如果存在多项错误，会一次性列出全部错误并停止进程。

## 必填变量

| 变量 | 生产要求 | 说明 |
| --- | --- | --- |
| `DATABASE_URL` 或 `DATABASE_DRIVER=pglite` | 必填其一 | PostgreSQL 连接串；或显式选择 PGlite 文件数据库 |
| `NUXT_AUTH_SECRET` | 必填 | access JWT、邮箱验证、一次性 token 与 OAuth state 共用的 HS256/HMAC 签名密钥，缺失时鉴权应 fail-closed |
| `NUXT_API_KEY_SECRET` | 必填 | 用于生成 API Key，并派生 API Key/兑换码的 HMAC 查询摘要与 AES-256-GCM 加密密钥 |

## 推荐变量

| 变量 | 推荐值 | 说明 |
| --- | --- | --- |
| `NITRO_HOST` | `127.0.0.1` | VPS + Nginx 反向代理时只监听本机 |
| `NITRO_PORT` | `3000` | Nitro 服务端口 |
| `NODE_ENV` | `production` | 让 Nuxt、Vue Router 和相关依赖使用生产分支，减少开发警告和日志噪声 |
| `TZ` | `Asia/Shanghai` | 统一日志、统计、运维时间以及数据库迁移中的自然日转换 |
| `DATABASE_POOL_SIZE` | `10` | `postgres-js` 连接池上限，启动迁移会单独使用 `max=1` 的连接 |
| `DATABASE_DRIVER` | 留空或 `pglite` | 留空时有 `DATABASE_URL` 使用 PostgreSQL；生产无 PostgreSQL 时必须显式设为 `pglite` |
| `PGLITE_DATA_DIR` | `.data/pglite` | PGlite 数据目录；生产使用 PGlite 时必须纳入备份 |
| `DB_AUTO_MIGRATE` | 留空 | 默认启动时自动迁移；设置为 `false` 可临时跳过启动迁移 |
| `MIGRATIONS_DIR` | 留空 | 仅迁移目录不在默认位置时设置；常规生产启动会读取 `.output/server/db/migrations/postgresql` |
| `NUXT_REDIS_URL` | 留空 | Redis 连接地址；配置后启用共享原子限流和公开短缓存 |
| `NUXT_REDIS_KEY_PREFIX` | `openapi:` | Redis key 命名空间；同一 Redis 服务部署多个环境时必须区分 |
| `NUXT_REDIS_CONNECT_TIMEOUT_MS` | `2000` | Redis 首次连接超时毫秒数 |
| `NUXT_REDIS_REQUIRED` | `false` | `true` 时限流或分布式协调所需 Redis 缺失/不可用会 fail-closed；不改变公开缓存的数据库回源策略 |
| `NUXT_PROXY_SOURCE` | 留空 | 留空时由管理后台配置；可设 `direct`、`cloudflare`、`x_forwarded_for`。一旦设置，环境变量优先并锁定后台对应表单 |
| `NUXT_PROXY_TRUSTED_CIDRS` | 留空 | 允许提供客户端 IP 请求头的直连代理 IP/CIDR，多个值用逗号分隔；支持 IPv4、IPv6、`0.0.0.0/0` 与 `::/0` |
| `NUXT_PROXY_FORWARDED_HOPS` | `1` | 从 `X-Forwarded-For` 右侧计算的可信代理层数，最多 10 层 |

生产如果前面有 Nginx、Caddy 或面板反向代理，应设置 `NITRO_HOST=127.0.0.1`，避免 Nitro 直接暴露到公网；容器部署可以使用镜像或 Compose 提供的监听默认值。

Redis 当前用于公开 API 限流、登录/注册/密码重置/OAuth 身份防刷，公开统计与内容短缓存，以及扣费补偿扫描的分布式互斥。限流 key 使用 HMAC 摘要，不会把邮箱、账号或 IP 明文写入 Redis；站点 SMTP、OAuth、Turnstile 密钥、用户私有响应、积分与调用日志不会进入共享缓存。

缓存采用 cache-aside、TTL 抖动、进程内请求合并和 Redis 短锁；管理端写入后立即删除固定缓存或递增版本。Redis 未配置或缓存命令失败时自动回源数据库，不会让公开页面变成 503。扣费扫描使用带 token 校验和固定 TTL 的最小 Redis lease；可选模式故障时回退当前进程互斥，强制模式则跳过任务，避免多实例重复调度。

单 Platform 实例开发可以不配置 Redis。多个 Platform Node 实例的生产部署必须使用 PostgreSQL，并同时配置 `NUXT_REDIS_URL` 与 `NUXT_REDIS_REQUIRED=true`；PGlite 数据目录只允许一个 Platform 进程。API Service 不连接 Platform 的 PostgreSQL 或 Redis。PostgreSQL 迁移另有数据库 advisory lock，即使多个 Platform 实例同时启动也会串行执行。

`openapi-service` 的地址不是全局环境变量，而是 Platform 数据库中的 Internal Upstream Target，例如 Compose 内网地址 `http://openapi-service:8080`。同一 Upstream 可保存多个相同契约 Target，并使用轮询或权重分流。

Platform 不读取全局 API Service Token。每个 Internal Upstream 在数据库中独立加密保存 Token，Gateway 按匹配到的 Upstream 解密并注入 `Authorization: Service <token>`。

Compose 使用 `OPENAPI_SERVICE_TOKEN` 注入 Node API Service 的 `API_SERVICE_TOKEN`。管理员首次创建官方 Internal Upstream 时在后台填写同值；之后 Platform 只使用数据库密文。轮换期间可直接为 Service 临时配置 `API_SERVICE_PREVIOUS_TOKEN`，在 Upstream 页面更新 Token 并重新发现后清空上一值。

Node API Service 的部署配置只覆盖进程边界，例如 `LISTEN_ADDR`、请求与退出超时、请求体上限、`SERVICE_CONFIG_FILE` 和业务数据目录。某个业务模块需要的来源地址、Cookie、数据库授权密钥或算法开关必须由该模块的 Service Schema 声明，不进入任一仓库的 `.env.example`。API Service 不使用 `NUXT_*` 业务变量，也不读取 Platform 数据库。

两个仓库的构建变量与运行变量必须分离。CI 或开发机完成 Nuxt 与 TypeScript 构建后生成镜像；生产服务器只注入运行时变量并启动镜像，不执行 `pnpm install`、`pnpm build` 或 `docker build`。

管理员账号与用户共用 `users` 表，通过 `users.role='admin'` 区分，并统一从 `/login` 登录。启动时如果不存在任何管理员账号，服务端会创建默认管理员并仅输出一次随机初始密码。管理员登录后必须完成不可关闭的资料和密码初始化。

首次登录后，如果管理员仍使用初始用户名或邮箱，系统会显示一次初始化弹窗，用于确认用户名、邮箱并强制设置新密码。后续用户名不再作为常规资料项修改，以保证登录日志、操作日志和审计链路稳定。

当前数据库使用单一 `0000` 基线。构建时迁移目录会复制到 `.output/server/db/migrations/postgresql`，生产 Node 进程启动时自动应用；`pnpm db:migrate` 仅作为手动修复或演练入口。PGlite 使用同一套 PostgreSQL 方言迁移。

不兼容该基线的数据库或 Volume 不能依赖历史 journal 自动升级。测试和部署应使用全新 PostgreSQL 数据库、全新 PGlite 目录或经验证的数据导入；需要保留的数据必须先备份和校验。

数据库建议：

- PostgreSQL 适合常规生产、远程数据库、成熟备份和未来扩展。
- PGlite 适合单进程、低运维成本、自包含的小型部署；它不是多实例共享数据库，使用时备份 `PGLITE_DATA_DIR`。
- 生产环境如果没有 `DATABASE_URL`，必须显式设置 `DATABASE_DRIVER=pglite`，避免漏配时静默创建新库。

## 密钥生成

每个密钥单独生成，不要和其他系统复用：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`NUXT_AUTH_SECRET` 和 `NUXT_API_KEY_SECRET` 使用独立的 32 bytes 随机值；每个 Internal Upstream 的 Service Token 也必须单独生成，至少 32 个随机字符，不与前两者复用。`NUXT_AUTH_SECRET` 泄露后立即轮换，并观察登录、邮箱验证与 OAuth 相关异常。`NUXT_API_KEY_SECRET` 同时用于 API Key/兑换码以及 Upstream Token/Service 业务 Secret 的分域加密；直接更换会使现有密文无法解密，因此应妥善备份并制定数据轮换流程。

API Key 和兑换码明文不会落库。数据库只保存带密钥的 HMAC 摘要、随机 IV 的 AES-256-GCM 密文和掩码预览；服务端在授权列表接口中解密后返回，以保留重复查看和复制体验。

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
NUXT_API_KEY_SECRET='replace-with-random-hex' \
pm2 start server/index.mjs --name openapi-platform --update-env
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
NUXT_API_KEY_SECRET='replace-with-random-hex' \
pm2 start server/index.mjs --name openapi-platform --update-env
```

## 风险清单

| 风险 | 处理方式 |
| --- | --- |
| 构建机 `.env` 泄露到产物 | 不在 runtimeConfig 默认值读取异名 `process.env` |
| 多环境共用密钥 | 每个环境独立生成并独立轮换 |
| Internal Upstream Token 泄露 | Service 短时配置 Previous Token，在对应 Upstream 管理页更新加密 Token 并重新发现，确认生效后删除旧值 |
| 生产监听公网端口 | `NITRO_HOST=127.0.0.1`，由 Nginx 代理公网流量 |
| 数据库迁移误连 | PostgreSQL 发布前确认 `DATABASE_URL` 的主机、库名和用户；PGlite 发布前确认 `PGLITE_DATA_DIR` |
| 自动迁移误执行 | 维护窗口可临时设置 `DB_AUTO_MIGRATE=false`，手动确认后再恢复默认 |
| Redis 故障后限流失效 | 正式生产设置 `NUXT_REDIS_REQUIRED=true`，并监控 `/api/ready` |
| Redis 故障后后台任务重复 | 多实例必须设置 `NUXT_REDIS_REQUIRED=true`；租约不可用时任务 fail-closed |
| Redis 缓存命中率下降 | 检查 Redis 延迟、内存和淘汰统计；应用会回源数据库，但数据库负载会升高 |
| 数据库或备份泄露 API Key | 数据库字段已使用 AES-256-GCM 加密；仍需隔离应用运行密钥并限制数据库、备份和服务端权限 |
| 伪造客户端 IP 请求头 | 优先使用后台的直连模式；启用 Cloudflare/XFF 时仅配置真实直连代理，避免使用 `0.0.0.0/0` 或 `::/0`，并阻止绕过代理直连源站 |
| 环境变量配置变更未生效 | 使用 `pm2 restart openapi-platform --update-env` 或等价重启命令；后台数据库配置无需重启 |

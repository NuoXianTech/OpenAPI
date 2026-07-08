# 运行时配置

本项目按 Nuxt 官方 runtimeConfig 范式管理生产配置。生产密钥只允许在运行时通过环境变量注入，不允许写入源码、文档、镜像层或构建产物。

## 基本原则

- `nuxt.config.ts` 中的私有配置默认值保持空字符串。
- 生产环境使用 `NUXT_AUTH_*`、`DATABASE_URL`、`NITRO_*` 等变量覆盖。
- 不在 `nuxt.config.ts` 默认值中读取异名 `process.env`，避免构建时把密钥烤进 `.output`。
- `.env.example` 只能放示例值；真实生产值配置在服务器面板、PM2 ecosystem、容器 secret 或 CI/CD secret 中。
- 修改配置后重启 Node/Nitro 进程，确保运行时读取新值。

## 必填变量

| 变量 | 生产要求 | 说明 |
| --- | --- | --- |
| `DATABASE_URL` | 必填 | PostgreSQL 连接串，生产必须指向稳定数据库实例 |
| `NUXT_AUTH_ADMIN_USERNAME` | 必填 | 内置管理员用户名，来自运行时配置，不落库 |
| `NUXT_AUTH_ADMIN_PASSWORD` | 必填 | 内置管理员密码，来自运行时配置；轮换时修改环境变量并重启进程 |
| `NUXT_AUTH_SECRET` | 必填 | access JWT、邮箱验证、一次性 token 与 OAuth state 共用的 HS256/HMAC 签名密钥，缺失时鉴权应 fail-closed |
| `NUXT_AUTH_API_KEY_SECRET` | 必填 | API Key 相关服务端密钥 |

## 推荐变量

| 变量 | 推荐值 | 说明 |
| --- | --- | --- |
| `NITRO_HOST` | `127.0.0.1` | VPS + Nginx 反向代理时只监听本机 |
| `NITRO_PORT` | `3000` | Nitro 服务端口 |
| `TZ` | `Asia/Shanghai` | 统一日志、统计和运维时间 |
| `DATABASE_POOL_SIZE` | `10` | 应用运行时 postgres-js 连接池大小，未设置时由构建后替换的 db client 使用默认值 10 |
| `MIGRATIONS_DIR` | 留空 | 仅迁移目录不在默认位置时设置，常规 `.output/start.mjs` 不需要 |
| `NUXT_AUTH_ADMIN_EMAIL` | 管理员邮箱 | 用于展示或通知 |

`.env.example` 为直接启动和本地调试保留 `NITRO_HOST=0.0.0.0`。生产如果前面有 Nginx、Caddy 或面板反向代理，应覆盖为 `127.0.0.1`，避免 Nitro 直接暴露到公网。

管理员账号不是 `users` 表中的普通用户，当前后台没有修改 `NUXT_AUTH_ADMIN_PASSWORD` 的页面。生产轮换管理员凭据时，修改进程环境变量后执行 `pm2 restart openapi --update-env` 或等价重启。

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
TZ=Asia/Shanghai \
DATABASE_URL='postgresql://user:password@127.0.0.1:5432/openapi' \
NUXT_AUTH_ADMIN_USERNAME='admin' \
NUXT_AUTH_ADMIN_PASSWORD='change-me' \
NUXT_AUTH_ADMIN_EMAIL='admin@example.com' \
NUXT_AUTH_SECRET='replace-with-random-hex' \
NUXT_AUTH_API_KEY_SECRET='replace-with-random-hex' \
pm2 start start.mjs --name openapi --update-env
```

## 风险清单

| 风险 | 处理方式 |
| --- | --- |
| 构建机 `.env` 泄露到产物 | 不在 runtimeConfig 默认值读取异名 `process.env` |
| 多环境共用密钥 | 每个环境独立生成并独立轮换 |
| 生产监听公网端口 | `NITRO_HOST=127.0.0.1`，由 Nginx 代理公网流量 |
| 数据库迁移误连 | 发布前确认 `DATABASE_URL` 的主机、库名和用户 |
| 配置变更未生效 | 使用 `pm2 restart openapi --update-env` 或等价重启命令 |

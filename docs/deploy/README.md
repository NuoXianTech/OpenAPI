# 生产部署指南

目标形态：**单台 VPS / 单个容器**，运行 Node Server，外接托管 PG（Neon / Supabase / RDS / 自建 PG16）。

## 0. 前置条件

| 项 | 说明 |
| --- | --- |
| Node | 22 LTS（本地构建用，容器内已带） |
| pnpm | 10.x（本地构建用） |
| PostgreSQL | 16+，已建库，拿到 `DATABASE_URL`（带 `?sslmode=require`） |
| Docker | 24+（部署机） |
| 域名 + TLS | 反向代理终止 TLS（Caddy 推荐，自动 Let's Encrypt） |

## 1. 准备环境变量

复制 `.env.example` → `.env.production`，按注释填写：

```bash
cp .env.example .env.production
# 用 openssl rand -hex 32 生成密钥
openssl rand -hex 32  # → EMAIL_VERIFY_SECRET
openssl rand -hex 32  # → OAUTH_SECRET_KEY
```

必填：`ADMIN_*`、`EMAIL_VERIFY_SECRET`、`OAUTH_SECRET_KEY`、`DATABASE_URL`。

## 2. 跑数据库迁移（在本地或 CI，**不在容器内**）

```bash
DATABASE_URL='postgresql://...' pnpm db:migrate:prod
```

迁移幂等，重复执行不会重复建表。**每次发布前都跑一次**，没有新迁移就 noop。

## 3. 构建镜像

```bash
docker build -t openapi:$(git rev-parse --short HEAD) .
docker tag openapi:$(git rev-parse --short HEAD) openapi:latest
```

镜像约 200 MB（alpine + Nuxt 产物，无 node_modules）。

## 4. 启动容器

```bash
docker run -d \
  --name openapi \
  --restart unless-stopped \
  --env-file .env.production \
  -p 127.0.0.1:3000:3000 \
  openapi:latest
```

- 只绑 `127.0.0.1:3000` —— 公网通过反代访问，容器端口不直接暴露
- `--restart unless-stopped` —— 异常退出自动拉起，但 `docker stop` 不会
- `HEALTHCHECK` 已在 Dockerfile 内置，30 s 探一次 `/api/health`

验证：

```bash
docker ps                              # STATUS 列应显示 (healthy)
curl http://127.0.0.1:3000/api/health  # {"ok":true,"ts":...}
```

## 5. 反向代理 + TLS（Caddy）

`/etc/caddy/Caddyfile`：

```caddy
example.com {
  encode zstd gzip
  reverse_proxy 127.0.0.1:3000
}
```

`sudo systemctl reload caddy`，Caddy 自动签发并续期 Let's Encrypt 证书。

> 用 Nginx 同理：`proxy_pass http://127.0.0.1:3000;`，证书可用 `certbot --nginx`。

## 6. 首次部署后必做

1. 用 `ADMIN_USERNAME` / `ADMIN_PASSWORD` 登录 `/admin/login`
2. 进 **站点设置** → 把 **siteUrl** 改成真实域名（`https://example.com`，**不带尾斜杠**）
   - 影响：OAuth 回调地址、邮件正文里的链接
3. 配置 **SMTP**（站点设置 → SMTP 卡片），否则邮箱验证、密码重置邮件发不出去
4. 按需开启 **Turnstile**（站点设置 → 安全卡片），先留好 Cloudflare 的 siteKey/secret
5. 按需开启 **OAuth provider**（管理 → OAuth 配置），填 client_id / client_secret，回调地址会自动按 siteUrl 拼好
6. 立即改管理员密码（管理 → 管理员资料）

## 7. 升级流程

```bash
git pull
DATABASE_URL='...' pnpm db:migrate:prod              # 1. 跑新迁移（若有）
docker build -t openapi:$(git rev-parse --short HEAD) .
docker stop openapi && docker rm openapi             # 2. 停旧容器
docker run -d --name openapi ... openapi:latest      # 3. 起新容器（同 step 4）
```

零停机升级需要双实例 + 反代切流，单实例方案接受 1-2 秒中断。

## 8. 日志 / 备份

- **应用日志**：`docker logs -f openapi`，stdout/stderr 直接走 Docker
- **PG 备份**：由托管服务（Neon/Supabase/RDS）提供，自建 PG16 需配 `pg_dump` 定时任务
- **siteSettings** 关键数据（OAuth client_secret 已 AES-GCM 加密）存 PG，库备份即可

## 9. 故障排查

| 症状 | 检查项 |
| --- | --- |
| `docker ps` 显示 `(unhealthy)` | `docker logs openapi`；检查 `DATABASE_URL` 是否能连通 |
| 邮件发不出 | 后台 SMTP 配置 → 用 SMTP 卡片的 **测试邮件** 按钮 |
| OAuth 回调 404 / mismatch | siteUrl 是否带 https、是否带尾斜杠；OAuth provider 后台的回调 URL 是否与 `${siteUrl}/api/auth/oauth/<provider>/callback` 一致 |
| 限流没生效 | 单实例下默认 `memory` 正常；若开了多实例需要设 `NUXT_API_GUARD_RATE_LIMIT_DRIVER=postgres` |
| 首页标题没动 | `/api/settings/public` 返回值里 `siteName` 是否正确；浏览器是否命中 `cache-control: max-age=30` 的旧缓存（强刷一次） |

## 10. 关键路径速查

- Dockerfile: [Dockerfile](../../Dockerfile)
- 启动命令: `node .output/server/index.mjs`（[package.json:5](../../package.json) `start` 脚本）
- 健康检查: [server/api/health.get.ts](../../server/api/health.get.ts)
- 限流 driver 选择: [server/utils/rateLimit/index.ts:26-30](../../server/utils/rateLimit/index.ts)
- 站点标题模板: [app/app.vue](../../app/app.vue)
- siteSettings DB schema: [server/db/schema/system.ts](../../server/db/schema/system.ts)

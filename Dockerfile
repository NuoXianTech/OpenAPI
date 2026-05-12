# syntax=docker/dockerfile:1.7

# ---- deps: 安装全量依赖（含 devDependencies，build 阶段需要）----
FROM node:22-alpine AS deps
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ---- build: 编译 Nuxt 产物，输出到 .output/ ----
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# ---- runtime: 只带 .output/ 和 drizzle 迁移文件，无 node_modules ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NITRO_PORT=3000 \
    NITRO_HOST=0.0.0.0

# wget 用于 HEALTHCHECK；tini 处理信号转发，避免 PID1 收不到 SIGTERM
RUN apk add --no-cache tini wget

COPY --from=build /app/.output ./.output
# drizzle 迁移产物：容器内可执行 pnpm db:migrate:prod
COPY --from=build /app/server/db ./server/db
COPY package.json ./

EXPOSE 3000
USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", ".output/server/index.mjs"]

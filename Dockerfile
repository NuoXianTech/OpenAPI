FROM node:24-bookworm-slim AS build

ARG PNPM_VERSION=11.20.0

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV CI=true

WORKDIR /app

RUN corepack enable \
  && corepack prepare pnpm@${PNPM_VERSION} --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY . .
RUN pnpm run postinstall \
  && pnpm build

FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000

WORKDIR /app

COPY --from=build --chown=node:node /app/.output ./
RUN mkdir -p /app/.data \
  && chown node:node /app/.data

USER node

EXPOSE 3000

CMD ["node", "server/index.mjs"]

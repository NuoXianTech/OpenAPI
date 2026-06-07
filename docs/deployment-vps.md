# VPS Deployment

This project is best deployed as a single Node/Nitro process plus one PostgreSQL database.

## Build Locally Or In CI

```bash
pnpm install --frozen-lockfile
pnpm build
```

The build command creates `.output/server/index.mjs`, `.output/start.mjs`, and `.output/package.json`. Starting `.output/start.mjs` runs database migrations first, then starts Nitro.

## Files To Upload

Upload the whole `.output` directory to the server. The production entry is:

```bash
node .output/start.mjs
```

If you run commands from inside `.output`, use:

```bash
node start.mjs
```

## Server Environment

Configure these variables in your server panel or process manager:

```bash
NITRO_PORT=3000
NITRO_HOST=127.0.0.1
TZ=Asia/Shanghai

DATABASE_URL=postgresql://user:password@127.0.0.1:5432/openapi

NUXT_AUTH_ADMIN_USERNAME=admin
NUXT_AUTH_ADMIN_PASSWORD=change-me
NUXT_AUTH_ADMIN_EMAIL=admin@example.com
NUXT_AUTH_EMAIL_VERIFY_SECRET=change-me
NUXT_AUTH_API_KEY_SECRET=change-me
NUXT_AUTH_JWT_SECRET=change-me
```

Generate production secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Startup

The generated start script runs migrations before the app starts:

```bash
cd .output
node start.mjs
```

The migration runner uses `DATABASE_URL` and Drizzle's `drizzle.__drizzle_migrations` table, so already-applied migrations are skipped.

## Suggested Process Manager

PM2 is the simplest option:

```bash
cd .output
pm2 start start.mjs --name openapi --update-env
pm2 save
```

For a new release:

```bash
cd .output
pm2 restart openapi --update-env
```

Put Nginx in front of the Node process and proxy to `127.0.0.1:3000`.

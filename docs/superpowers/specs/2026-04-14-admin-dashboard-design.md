# Admin Dashboard Design Spec

## Context

The project has a fully built backend with 26 admin API routes covering APIs, Users, Friend Links, FAB Menu, Call Statistics, and Site Settings. Auth middleware (`auth-admin.ts`) and composables (`useAuth` with `adminLogin`/`ensureAdmin`, `useAdminWorkspace`) are ready. The frontend admin pages are completely missing — no admin layout, no admin pages, no admin components exist yet.

This spec defines the admin dashboard built on Nuxt UI v4's dashboard components (`UDashboardGroup`, `UDashboardSidebar`, `UDashboardPanel`, etc.), following the official [nuxt-ui-templates/dashboard](https://github.com/nuxt-ui-templates/dashboard) template patterns.

## Decisions

- **Sidebar**: Grouped navigation — main nav (6 items) + bottom nav (settings, return to frontend)
- **Dashboard home**: Overview stat cards + quick action buttons
- **CRUD interaction**: Modal dialogs for add/edit forms
- **Admin login**: Minimal style (plain bg + centered card), no auth-shell

## Route Structure

| Route | Page | Layout | Middleware |
|-------|------|--------|-----------|
| `/admin/login` | Admin login | `false` (standalone) | none |
| `/admin` | Dashboard overview | `admin` | `auth-admin` |
| `/admin/apis` | API management | `admin` | `auth-admin` |
| `/admin/users` | User management | `admin` | `auth-admin` |
| `/admin/friend-links` | Friend links | `admin` | `auth-admin` |
| `/admin/fab-menu` | FAB menu | `admin` | `auth-admin` |
| `/admin/calls` | Call statistics | `admin` | `auth-admin` |
| `/admin/settings` | Site settings | `admin` | `auth-admin` |

## File Structure

```
app/
  layouts/
    admin.vue
  pages/
    admin/
      login.vue
      index.vue
      apis.vue
      users.vue
      friend-links.vue
      fab-menu.vue
      calls.vue
      settings.vue
  components/
    admin/
      AdminAddApiModal.vue
      AdminAddLinkModal.vue
      AdminAddFabModal.vue
      AdminDeleteModal.vue
```

## Layout: `app/layouts/admin.vue`

Uses `UDashboardGroup` > `UDashboardSidebar` + `<slot />` pattern from the Nuxt UI dashboard template.

**Sidebar structure:**
- **Header**: Site name from `useSiteSettings()` (or fallback "Admin")
- **Main navigation** (`UNavigationMenu`, orientation vertical):
  - 仪表盘 `/admin` — icon: `i-lucide-house`
  - API 管理 `/admin/apis` — icon: `i-lucide-radio`
  - 用户管理 `/admin/users` — icon: `i-lucide-users`
  - 友情链接 `/admin/friend-links` — icon: `i-lucide-link`
  - 调用统计 `/admin/calls` — icon: `i-lucide-bar-chart-3`
  - FAB 菜单 `/admin/fab-menu` — icon: `i-lucide-circle-plus`
- **Bottom navigation** (`UNavigationMenu`, `mt-auto`):
  - 站点设置 `/admin/settings` — icon: `i-lucide-settings`
  - 返回前台 `/` — icon: `i-lucide-arrow-left`
- **Footer**: Admin user menu with logout button via `UDropdownMenu`

**Key behaviors:**
- Sidebar is collapsible and resizable (matching template: `collapsible resizable`)
- Uses `UDashboardSidebarCollapse` in each page's navbar leading slot
- Icon set: `lucide` (template uses `@iconify-json/lucide` — already in template deps, needs to be added to project)

## Pages

### Admin Login (`/admin/login`)

- `definePageMeta({ layout: false })` — standalone page, no sidebar
- Minimal centered card on `bg-default`
- Form: username + password inputs (`UInput`) + login button (`UButton`)
- Uses `useAuth().adminLogin()` on submit
- On success: `navigateTo('/admin')`
- Error display via `UFormField` validation or inline error text
- No zod schema needed (simple 2-field form)

### Dashboard Home (`/admin`)

- `definePageMeta({ middleware: 'auth-admin' })`
- `UDashboardPanel` with navbar title "仪表盘"
- Fetches from `/api/admin/calls/stats` via `useFetch`
- **Overview cards** (grid 2×2 or 4-col): Total calls, Today calls, Registered users, Tracked APIs
  - Each card: `UPageCard` or `UCard` with label + large number
- **Quick actions**: Row of `UButton` links — 新增 API, 新增友情链接, 站点设置

### API Management (`/admin/apis`)

- Fetches from `/api/admin/apis/list`
- **Toolbar**: `UInput` search + `USelect` status filter + "新增 API" `UButton`
- **Table** (`UTable` with `@tanstack/table-core`):
  - Columns: 名称, 状态 (badge), 分类, 方法 (badge), 路径, 启用 (toggle), 统计 (toggle), 操作
  - Row actions dropdown: 编辑, 删除
  - Toggle columns call `/api/admin/apis/toggle`
- **Add/Edit Modal** (`AdminAddApiModal.vue`):
  - Fields: code, name, status (select), category, shortDesc, description (textarea), httpMethod, apiPath, docUrl, isApiKey (switch), rateLimitPerMinute
  - `UForm` + zod schema validation
  - POST `/api/admin/apis/add` or PUT `/api/admin/apis/update`

### User Management (`/admin/users`)

- Fetches from `/api/admin/users/list`
- **Toolbar**: `UInput` keyword search
- **Table columns**: 用户名, 邮箱, 显示名, 状态 (active badge), 封禁 (banned badge), 注册时间, 操作
- **Row actions**: 编辑, 封禁/解封, 删除, 管理 API Key
- **Edit**: reuse modal pattern — PUT `/api/admin/users/update`
- **Ban/Unban**: confirmation then POST `/api/admin/users/ban`
- **API Key management**: sub-modal or expandable showing user's keys with add/reset/delete actions
  - GET `/api/admin/users/apikeys?userId=X`
  - POST add/reset/delete endpoints

### Friend Links (`/admin/friend-links`)

- Fetches from `/api/admin/friend-links/list`
- **Toolbar**: "新增链接" button
- **Table columns**: 标题, URL, 描述, 状态 (active badge), 操作
- **Row actions**: 编辑, 删除
- **Add/Edit Modal** (`AdminAddLinkModal.vue`):
  - Fields: title, url, description, isActive (switch)
  - POST add or PUT update

### FAB Menu (`/admin/fab-menu`)

- Fetches from `/api/admin/fab-menu/list`
- **Toolbar**: "新增菜单项" button
- **Table columns**: 标题, 副标题, 图标, 操作类型, 操作值, 排序, 启用, 操作
- **Row actions**: 编辑, 删除
- **Add/Edit Modal** (`AdminAddFabModal.vue`):
  - Fields: title, subtitle, icon, actionType (select: link/route/iframe), actionValue, actionLabel, target (select: _blank/_self), sort (number), isActive (switch)
  - POST add or PUT update

### Call Statistics (`/admin/calls`)

- Read-only page
- Fetches from `/api/admin/calls/stats` for summary + `/api/admin/calls/list` for detail
- **Summary cards**: Total calls, Success, Failure, Success rate
- **Table**: `UTable` showing call records — API name, path, method, status code, latency, IP, timestamp
- Pagination via `@tanstack/table-core` `getPaginationRowModel`

### Site Settings (`/admin/settings`)

- Fetches from `/api/admin/settings/get`
- `UForm` + zod validation
- Sections using `UPageCard` (matching template's settings pattern):
  - **基本信息**: siteUrl, siteImg, siteName, siteDescription, startTime
  - **会话配置**: sessionMaxAgeSeconds
  - **邮件 SMTP**: smtpHost, smtpPort, smtpSecure (switch), smtpUser, smtpPass, smtpFrom, emailVerifyExpiresInMinutes
- Save button: PUT `/api/admin/settings/update`
- Success/error feedback via `useToast()`

## Shared Components

### `AdminDeleteModal.vue`

Generic delete confirmation modal. Props: `title`, `description`, `loading`. Emits: `confirm`, `cancel`. Used by all CRUD pages for delete operations.

### Modal Pattern

Each add/edit modal:
- Uses `UModal` with `v-model:open`
- Props: `item` (null for add, object for edit), `open`
- Emits: `saved` (triggers parent refetch), `update:open`
- Internal `UForm` + zod schema
- Submit calls the appropriate API endpoint
- Shows toast on success/error

## Dependencies to Add

- `@iconify-json/lucide` — icon set used by the dashboard template (the project currently uses `@iconify-json/mdi`; lucide is the template default)

Alternatively, keep using `mdi` icons and map to equivalent mdi icon names. This avoids adding a new dependency.

**Decision: Use existing `mdi` icons** — avoids new dependency, the project already uses mdi throughout.

Icon mapping:
- house → `mdi:view-dashboard-outline`
- radio → `mdi:api`
- users → `mdi:account-group-outline`
- link → `mdi:link-variant`
- bar-chart-3 → `mdi:chart-bar`
- circle-plus → `mdi:plus-circle-outline`
- settings → `mdi:cog-outline`
- arrow-left → `mdi:arrow-left`

## Verification

1. `pnpm dev` — start dev server
2. Navigate to `/admin/login` — verify login form, submit with admin credentials, redirect to `/admin`
3. `/admin` — verify overview cards show data, quick action buttons navigate correctly
4. `/admin/apis` — verify table loads, search/filter work, add/edit/delete/toggle operations succeed
5. `/admin/users` — verify table, edit, ban/unban, delete, API key management
6. `/admin/friend-links` — verify CRUD operations
7. `/admin/fab-menu` — verify CRUD operations
8. `/admin/calls` — verify read-only stats display
9. `/admin/settings` — verify form loads current values, save persists changes
10. Sidebar navigation — verify all links active state, collapse/expand, responsive behavior
11. Auth protection — verify unauthenticated access redirects to `/admin/login`

# Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete admin dashboard for the OpenAPI management platform using Nuxt UI v4 dashboard components, covering login, API/user/link/fab/calls management, and site settings.

**Architecture:** Nuxt layout `admin.vue` wraps all `/admin/*` pages with `UDashboardGroup` + `UDashboardSidebar`. Each page uses `UDashboardPanel` with navbar + body slots. CRUD pages use `UTable` for listing and `UModal` for add/edit forms. All 26 backend API routes are already built.

**Tech Stack:** Nuxt 4, Nuxt UI v4 (`UDashboardGroup`, `UDashboardSidebar`, `UDashboardPanel`, `UDashboardNavbar`, `UTable`, `UModal`, `UForm`), Tailwind CSS v4, zod validation, @tanstack/table-core

**Spec:** `docs/superpowers/specs/2026-04-14-admin-dashboard-design.md`

---

## File Structure

```
app/
  layouts/
    admin.vue                          # Dashboard layout with sidebar
  pages/
    admin/
      login.vue                        # Admin login (standalone, no layout)
      index.vue                        # Dashboard home with overview cards
      apis.vue                         # API management with UTable + CRUD
      users.vue                        # User management with UTable + CRUD
      friend-links.vue                 # Friend links management
      fab-menu.vue                     # FAB menu management
      calls.vue                        # Call statistics (read-only)
      settings.vue                     # Site settings form
  components/
    admin/
      AdminDeleteModal.vue             # Shared delete confirmation modal
      AdminApiModal.vue                # API add/edit modal
      AdminLinkModal.vue               # Friend link add/edit modal
      AdminFabModal.vue                # FAB menu item add/edit modal
```

---

### Task 1: Admin Layout

**Files:**
- Create: `app/layouts/admin.vue`

This is the foundation — all admin pages (except login) will use this layout.

- [ ] **Step 1: Create admin layout**

Create `app/layouts/admin.vue` with the following structure:
- `UDashboardGroup` root with `unit="rem"`
- `UDashboardSidebar` (collapsible, resizable) with header (site name), main nav, bottom nav, footer
- Main nav items: 仪表盘, API 管理, 用户管理, 友情链接, 调用统计, FAB 菜单
- Bottom nav items: 站点设置, 返回前台
- Footer: admin user menu with logout via `UDropdownMenu`
- Uses `useAuth()` for logout, `useSiteSettings()` for site name
- Icons: mdi set (already available in the project)
- `<slot />` for page content

```vue
<script setup lang="ts">
import type { NavigationMenuItem, DropdownMenuItem } from '@nuxt/ui'

const { user, logout } = useAuth()
const { settings } = useSiteSettings()
const router = useRouter()

const mainLinks = [[{
  label: '仪表盘',
  icon: 'i-mdi-view-dashboard-outline',
  to: '/admin'
}, {
  label: 'API 管理',
  icon: 'i-mdi-api',
  to: '/admin/apis'
}, {
  label: '用户管理',
  icon: 'i-mdi-account-group-outline',
  to: '/admin/users'
}, {
  label: '友情链接',
  icon: 'i-mdi-link-variant',
  to: '/admin/friend-links'
}, {
  label: '调用统计',
  icon: 'i-mdi-chart-bar',
  to: '/admin/calls'
}, {
  label: 'FAB 菜单',
  icon: 'i-mdi-plus-circle-outline',
  to: '/admin/fab-menu'
}]] satisfies NavigationMenuItem[][]

const bottomLinks = [[{
  label: '站点设置',
  icon: 'i-mdi-cog-outline',
  to: '/admin/settings'
}, {
  label: '返回前台',
  icon: 'i-mdi-arrow-left',
  to: '/'
}]] satisfies NavigationMenuItem[][]

const userMenuItems = computed<DropdownMenuItem[][]>(() => [[{
  type: 'label',
  label: user.value?.username || 'Admin'
}], [{
  label: '退出登录',
  icon: 'i-mdi-logout',
  async onSelect() {
    await logout()
    await router.push('/admin/login')
  }
}]])
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="admin"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <div class="flex items-center gap-2 p-2" :class="collapsed ? 'justify-center' : ''">
          <div class="size-8 shrink-0 rounded-lg bg-default border border-default flex items-center justify-center">
            <Icon name="mdi:shield-crown-outline" size="18" />
          </div>
          <span v-if="!collapsed" class="text-sm font-semibold truncate">
            {{ settings.siteName }}
          </span>
        </div>
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :collapsed="collapsed"
          :items="mainLinks[0]"
          orientation="vertical"
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="bottomLinks[0]"
          orientation="vertical"
          class="mt-auto"
        />
      </template>

      <template #footer="{ collapsed }">
        <UDropdownMenu
          :items="userMenuItems"
          :content="{ align: 'center', collisionPadding: 12 }"
          :ui="{ content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)' }"
        >
          <UButton
            :label="collapsed ? undefined : (user?.username || 'Admin')"
            :trailing-icon="collapsed ? undefined : 'i-mdi-chevron-up'"
            icon="i-mdi-account-circle-outline"
            color="neutral"
            variant="ghost"
            block
            :square="collapsed"
            class="data-[state=open]:bg-elevated"
          />
        </UDropdownMenu>
      </template>
    </UDashboardSidebar>

    <slot />
  </UDashboardGroup>
</template>
```

- [ ] **Step 2: Verify layout renders**

Run `pnpm dev`, manually navigate to any `/admin` route. At this point no admin pages exist, so the layout alone won't render, but the file should have no syntax errors. Check the dev server console for any compilation errors.

- [ ] **Step 3: Commit**

```bash
git add app/layouts/admin.vue
git commit -m "feat(admin): add dashboard layout with sidebar navigation"
```

---

### Task 2: Admin Login Page

**Files:**
- Create: `app/pages/admin/login.vue`

Standalone page (no admin layout). Minimal centered card on bg-default.

- [ ] **Step 1: Create admin login page**

Create `app/pages/admin/login.vue`:

```vue
<script setup lang="ts">
definePageMeta({ layout: false })

const { adminLogin } = useAuth()

const form = reactive({ username: '', password: '' })
const loading = ref(false)
const errorMsg = ref('')

async function handleLogin() {
  errorMsg.value = ''
  if (!form.username.trim() || !form.password) {
    errorMsg.value = '请输入用户名和密码'
    return
  }
  loading.value = true
  try {
    await adminLogin({ username: form.username.trim(), password: form.password })
    await navigateTo('/admin')
  }
  catch (err: any) {
    errorMsg.value = err?.data?.message || err?.message || '登录失败'
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <UApp>
    <div class="min-h-screen bg-default flex items-center justify-center p-4">
      <div class="w-full max-w-sm">
        <div class="text-center mb-6">
          <div class="inline-flex items-center justify-center size-12 rounded-xl bg-elevated border border-default mb-3">
            <Icon name="mdi:shield-crown-outline" size="24" />
          </div>
          <h1 class="text-xl font-semibold">
            管理员登录
          </h1>
          <p class="text-sm text-muted mt-1">
            请输入管理员凭据以继续
          </p>
        </div>

        <UCard class="shadow-[0_6px_16px_rgba(0,0,0,0.06)]">
          <form class="space-y-4 p-1" @submit.prevent="handleLogin">
            <UFormField label="用户名">
              <UInput
                v-model="form.username"
                placeholder="admin"
                icon="i-mdi-account-outline"
                autofocus
              />
            </UFormField>

            <UFormField label="密码">
              <UInput
                v-model="form.password"
                type="password"
                placeholder="••••••••"
                icon="i-mdi-lock-outline"
              />
            </UFormField>

            <div v-if="errorMsg" class="text-sm text-[var(--red)] bg-[var(--red)]/5 rounded-lg px-3 py-2">
              {{ errorMsg }}
            </div>

            <UButton
              type="submit"
              block
              :loading="loading"
            >
              登录
            </UButton>
          </form>
        </UCard>

        <div class="text-center mt-4">
          <UButton variant="link" size="sm" to="/" class="text-muted">
            返回前台
          </UButton>
        </div>
      </div>
    </div>
  </UApp>
</template>
```

- [ ] **Step 2: Verify login page**

Navigate to `/admin/login`. Verify:
- Centered card renders with username/password fields
- Submit with empty fields shows error
- Submit with wrong credentials shows error from API
- Submit with correct credentials redirects to `/admin`

- [ ] **Step 3: Commit**

```bash
git add app/pages/admin/login.vue
git commit -m "feat(admin): add admin login page"
```

---

### Task 3: Dashboard Home

**Files:**
- Create: `app/pages/admin/index.vue`

Overview page with stat cards and quick action buttons.

- [ ] **Step 1: Create dashboard home page**

Create `app/pages/admin/index.vue`:

```vue
<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth-admin' })

const { data, status } = await useFetch('/api/admin/calls/stats', {
  default: () => ({ code: 0, msg: '', data: { total: 0, success: 0, failure: 0, items: [] } })
})

const stats = computed(() => data.value?.data || { total: 0, success: 0, failure: 0, items: [] })
const successRate = computed(() => {
  if (!stats.value.total) return '0%'
  return `${((stats.value.success / stats.value.total) * 100).toFixed(1)}%`
})

const overviewCards = computed(() => [
  { label: '总调用次数', value: stats.value.total.toLocaleString(), icon: 'i-mdi-chart-line' },
  { label: '成功调用', value: stats.value.success.toLocaleString(), icon: 'i-mdi-check-circle-outline' },
  { label: '失败调用', value: stats.value.failure.toLocaleString(), icon: 'i-mdi-alert-circle-outline' },
  { label: '成功率', value: successRate.value, icon: 'i-mdi-percent' },
])
</script>

<template>
  <UDashboardPanel id="admin-home">
    <template #header>
      <UDashboardNavbar title="仪表盘">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        <UCard
          v-for="card in overviewCards"
          :key="card.label"
          class="shadow-sm"
        >
          <div class="flex items-center gap-3 px-1">
            <div class="flex items-center justify-center size-10 rounded-lg bg-default border border-default shrink-0">
              <UIcon :name="card.icon" class="size-5 text-muted" />
            </div>
            <div>
              <p class="text-xs text-muted">{{ card.label }}</p>
              <p class="text-xl font-semibold tabular-nums mt-0.5">{{ card.value }}</p>
            </div>
          </div>
        </UCard>
      </div>

      <UCard class="shadow-sm">
        <div class="px-1">
          <h3 class="font-semibold mb-1">快捷操作</h3>
          <p class="text-sm text-muted mb-4">常用管理功能快速入口</p>
          <div class="flex flex-wrap gap-2">
            <UButton variant="outline" color="neutral" to="/admin/apis" icon="i-mdi-api">
              API 管理
            </UButton>
            <UButton variant="outline" color="neutral" to="/admin/users" icon="i-mdi-account-group-outline">
              用户管理
            </UButton>
            <UButton variant="outline" color="neutral" to="/admin/friend-links" icon="i-mdi-link-variant">
              友情链接
            </UButton>
            <UButton variant="outline" color="neutral" to="/admin/settings" icon="i-mdi-cog-outline">
              站点设置
            </UButton>
          </div>
        </div>
      </UCard>

      <div v-if="status === 'pending'" class="text-center text-sm text-muted py-8">
        加载中...
      </div>
    </template>
  </UDashboardPanel>
</template>
```

- [ ] **Step 2: Verify dashboard**

Log in as admin, verify `/admin` shows stat cards with real data and quick action buttons.

- [ ] **Step 3: Commit**

```bash
git add app/pages/admin/index.vue
git commit -m "feat(admin): add dashboard home with overview cards"
```

---

### Task 4: Delete Confirmation Modal

**Files:**
- Create: `app/components/admin/AdminDeleteModal.vue`

Shared by all CRUD pages for delete operations.

- [ ] **Step 1: Create delete modal component**

Create `app/components/admin/AdminDeleteModal.vue`:

```vue
<script setup lang="ts">
const props = defineProps<{
  title?: string
  description?: string
  loading?: boolean
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ confirm: [] }>()
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <div class="p-6">
        <h3 class="text-lg font-semibold">
          {{ props.title || '确认删除' }}
        </h3>
        <p class="text-sm text-muted mt-2">
          {{ props.description || '此操作不可撤销，确定要删除吗？' }}
        </p>
        <div class="flex justify-end gap-2 mt-6">
          <UButton
            variant="outline"
            color="neutral"
            @click="open = false"
          >
            取消
          </UButton>
          <UButton
            color="error"
            :loading="props.loading"
            @click="emit('confirm')"
          >
            删除
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add app/components/admin/AdminDeleteModal.vue
git commit -m "feat(admin): add shared delete confirmation modal"
```

---

### Task 5: API Management Page + Modal

**Files:**
- Create: `app/components/admin/AdminApiModal.vue`
- Create: `app/pages/admin/apis.vue`

The most complex CRUD page — serves as the pattern for others.

- [ ] **Step 1: Create API add/edit modal**

Create `app/components/admin/AdminApiModal.vue`:

```vue
<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ item?: any }>()
const emit = defineEmits<{ saved: [] }>()
const toast = useToast()

const isEdit = computed(() => !!props.item)

const schema = z.object({
  code: z.string().min(1, '必填'),
  name: z.string().min(1, '必填'),
  shortDesc: z.string().min(1, '必填').max(30, '最多30字'),
  description: z.string().min(1, '必填'),
  httpMethod: z.string().min(1, '必填'),
  apiPath: z.string().min(1, '必填'),
  docUrl: z.string().min(1, '必填'),
  status: z.number().default(1),
  category: z.string().optional(),
  isEnabled: z.boolean().default(false),
  isApiKey: z.boolean().default(false),
  isStatistics: z.boolean().default(false),
  rateLimitPerMinute: z.number().min(0).default(0),
})

type Schema = z.output<typeof schema>

const defaultState: Partial<Schema> = {
  code: '',
  name: '',
  shortDesc: '',
  description: '',
  httpMethod: 'GET',
  apiPath: '',
  docUrl: '',
  status: 1,
  category: '',
  isEnabled: true,
  isApiKey: false,
  isStatistics: true,
  rateLimitPerMinute: 0,
}

const state = reactive<Partial<Schema>>({ ...defaultState })
const loading = ref(false)

watch(() => props.item, (val) => {
  if (val) {
    Object.assign(state, {
      code: val.code || '',
      name: val.name || '',
      shortDesc: val.shortDesc || '',
      description: val.description || '',
      httpMethod: val.httpMethod || 'GET',
      apiPath: val.apiPath || '',
      docUrl: val.docUrl || '',
      status: val.status ?? 1,
      category: val.category || '',
      isEnabled: val.isEnabled ?? true,
      isApiKey: val.isApiKey ?? false,
      isStatistics: val.isStatistics ?? true,
      rateLimitPerMinute: val.rateLimitPerMinute ?? 0,
    })
  }
  else {
    Object.assign(state, defaultState)
  }
}, { immediate: true })

const statusOptions = [
  { label: '正常', value: 1 },
  { label: '异常', value: 0 },
  { label: '未知', value: -1 },
  { label: '维护', value: 2 },
  { label: '废弃', value: 3 },
]

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    if (isEdit.value) {
      await $fetch('/api/admin/apis/update', {
        method: 'PUT',
        body: { id: props.item.id, ...event.data },
      })
    }
    else {
      await $fetch('/api/admin/apis/add', {
        method: 'POST',
        body: event.data,
      })
    }
    toast.add({ title: isEdit.value ? '更新成功' : '创建成功', color: 'success' })
    open.value = false
    emit('saved')
  }
  catch (err: any) {
    toast.add({ title: err?.data?.message || '操作失败', color: 'error' })
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <div class="p-6 max-h-[80vh] overflow-y-auto">
        <h3 class="text-lg font-semibold mb-4">
          {{ isEdit ? '编辑 API' : '新增 API' }}
        </h3>
        <UForm :schema="schema" :state="state" class="space-y-3" @submit="onSubmit">
          <div class="grid grid-cols-2 gap-3">
            <UFormField label="编码" name="code">
              <UInput v-model="state.code" placeholder="api-code" :disabled="isEdit" />
            </UFormField>
            <UFormField label="名称" name="name">
              <UInput v-model="state.name" placeholder="API 名称" />
            </UFormField>
          </div>
          <UFormField label="简短描述" name="shortDesc">
            <UInput v-model="state.shortDesc" placeholder="最多30字" />
          </UFormField>
          <UFormField label="详细描述" name="description">
            <UTextarea v-model="state.description" :rows="3" />
          </UFormField>
          <div class="grid grid-cols-2 gap-3">
            <UFormField label="请求方法" name="httpMethod">
              <UInput v-model="state.httpMethod" placeholder="GET,POST" />
            </UFormField>
            <UFormField label="状态" name="status">
              <USelect v-model="state.status" :items="statusOptions" />
            </UFormField>
          </div>
          <UFormField label="接口路径" name="apiPath">
            <UInput v-model="state.apiPath" placeholder="/api/v1/example" />
          </UFormField>
          <UFormField label="文档地址" name="docUrl">
            <UInput v-model="state.docUrl" placeholder="https://docs.example.com" />
          </UFormField>
          <div class="grid grid-cols-2 gap-3">
            <UFormField label="分类" name="category">
              <UInput v-model="state.category" placeholder="分类标签" />
            </UFormField>
            <UFormField label="限流(次/分)" name="rateLimitPerMinute">
              <UInput v-model.number="state.rateLimitPerMinute" type="number" />
            </UFormField>
          </div>
          <div class="flex flex-wrap gap-6 pt-1">
            <USwitch v-model="state.isEnabled" label="启用" />
            <USwitch v-model="state.isApiKey" label="需要 API Key" />
            <USwitch v-model="state.isStatistics" label="统计调用" />
          </div>
          <div class="flex justify-end gap-2 pt-3">
            <UButton variant="outline" color="neutral" @click="open = false">
              取消
            </UButton>
            <UButton type="submit" :loading="loading">
              {{ isEdit ? '保存' : '创建' }}
            </UButton>
          </div>
        </UForm>
      </div>
    </template>
  </UModal>
</template>
```

- [ ] **Step 2: Create API management page**

Create `app/pages/admin/apis.vue`:

```vue
<script setup lang="ts">
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'

definePageMeta({ layout: 'admin', middleware: 'auth-admin' })

const toast = useToast()
const UBadge = resolveComponent('UBadge')
const USwitch = resolveComponent('USwitch')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const keyword = ref('')
const { data, status, refresh } = await useFetch('/api/admin/apis/list', {
  query: computed(() => ({ keyword: keyword.value || undefined })),
  default: () => ({ code: 0, msg: '', data: [] }),
})

const items = computed(() => data.value?.data || [])

const modalOpen = ref(false)
const editItem = ref<any>(null)
const deleteOpen = ref(false)
const deleteTarget = ref<any>(null)
const deleteLoading = ref(false)

function openAdd() {
  editItem.value = null
  modalOpen.value = true
}

function openEdit(item: any) {
  editItem.value = item
  modalOpen.value = true
}

function openDelete(item: any) {
  deleteTarget.value = item
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    await $fetch('/api/admin/apis/delete', {
      method: 'POST',
      body: { id: deleteTarget.value.id },
    })
    toast.add({ title: '删除成功', color: 'success' })
    deleteOpen.value = false
    await refresh()
  }
  catch (err: any) {
    toast.add({ title: err?.data?.message || '删除失败', color: 'error' })
  }
  finally {
    deleteLoading.value = false
  }
}

async function handleToggle(item: any, field: 'isEnabled' | 'isStatistics', value: boolean) {
  try {
    await $fetch('/api/admin/apis/toggle', {
      method: 'PUT',
      body: { id: item.id, field, value },
    })
    await refresh()
  }
  catch (err: any) {
    toast.add({ title: '切换失败', color: 'error' })
  }
}

function getRowItems(row: any): DropdownMenuItem[] {
  return [{
    label: '编辑',
    icon: 'i-mdi-pencil-outline',
    onSelect: () => openEdit(row),
  }, {
    label: '删除',
    icon: 'i-mdi-delete-outline',
    color: 'error' as const,
    onSelect: () => openDelete(row),
  }]
}

const statusMap: Record<number, { label: string, color: string }> = {
  [-1]: { label: '未知', color: 'neutral' },
  0: { label: '异常', color: 'error' },
  1: { label: '正常', color: 'success' },
  2: { label: '维护', color: 'warning' },
  3: { label: '废弃', color: 'neutral' },
}

const columns: TableColumn<any>[] = [
  { accessorKey: 'name', header: '名称' },
  {
    accessorKey: 'status',
    header: '状态',
    cell: ({ row }) => {
      const info = statusMap[row.original.status] || statusMap[-1]
      return h(UBadge, { color: info.color, variant: 'subtle' }, () => info.label)
    },
  },
  { accessorKey: 'category', header: '分类' },
  {
    accessorKey: 'httpMethod',
    header: '方法',
    cell: ({ row }) => h(UBadge, { color: 'neutral', variant: 'outline' }, () => row.original.httpMethod),
  },
  { accessorKey: 'apiPath', header: '路径' },
  {
    accessorKey: 'isEnabled',
    header: '启用',
    cell: ({ row }) => h(USwitch, {
      modelValue: row.original.isEnabled,
      'onUpdate:modelValue': (val: boolean) => handleToggle(row.original, 'isEnabled', val),
    }),
  },
  {
    accessorKey: 'isStatistics',
    header: '统计',
    cell: ({ row }) => h(USwitch, {
      modelValue: row.original.isStatistics,
      'onUpdate:modelValue': (val: boolean) => handleToggle(row.original, 'isStatistics', val),
    }),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => h('div', { class: 'text-right' }, h(UDropdownMenu, {
      items: getRowItems(row.original),
      content: { align: 'end' },
    }, () => h(UButton, {
      icon: 'i-mdi-dots-vertical',
      color: 'neutral',
      variant: 'ghost',
      size: 'sm',
    }))),
  },
]
</script>

<template>
  <UDashboardPanel id="admin-apis">
    <template #header>
      <UDashboardNavbar title="API 管理">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton icon="i-mdi-plus" @click="openAdd">
            新增 API
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex items-center gap-2 mb-4">
        <UInput
          v-model="keyword"
          icon="i-mdi-magnify"
          placeholder="搜索名称、描述..."
          class="max-w-xs"
        />
      </div>

      <UTable
        :data="items"
        :columns="columns"
        :loading="status === 'pending'"
        class="shrink-0"
        :ui="{
          base: 'table-fixed',
          thead: '[&>tr]:bg-elevated/50',
          th: 'py-2',
          td: 'py-2',
        }"
      />

      <AdminAdminApiModal
        v-model:open="modalOpen"
        :item="editItem"
        @saved="refresh()"
      />

      <AdminAdminDeleteModal
        v-model:open="deleteOpen"
        :loading="deleteLoading"
        :title="`删除 API: ${deleteTarget?.name}`"
        description="删除后不可恢复，所有相关的调用统计数据将保留。"
        @confirm="confirmDelete"
      />
    </template>
  </UDashboardPanel>
</template>
```

- [ ] **Step 3: Verify API management**

Navigate to `/admin/apis`. Verify: table loads data, search filters, add/edit modal opens with form, toggle switches work, delete modal confirms and removes.

- [ ] **Step 4: Commit**

```bash
git add app/components/admin/AdminApiModal.vue app/pages/admin/apis.vue
git commit -m "feat(admin): add API management page with CRUD"
```

---

### Task 6: User Management Page

**Files:**
- Create: `app/pages/admin/users.vue`

Users page with table, edit/ban/delete actions, and API key sub-modal.

- [ ] **Step 1: Create user management page**

Create `app/pages/admin/users.vue`:

```vue
<script setup lang="ts">
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'

definePageMeta({ layout: 'admin', middleware: 'auth-admin' })

const toast = useToast()
const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const keyword = ref('')
const { data, status, refresh } = await useFetch('/api/admin/users/list', {
  query: computed(() => ({ keyword: keyword.value || undefined })),
  default: () => ({ code: 0, msg: '', data: [] }),
})
const items = computed(() => data.value?.data || [])

// Delete
const deleteOpen = ref(false)
const deleteTarget = ref<any>(null)
const deleteLoading = ref(false)

function openDelete(item: any) {
  deleteTarget.value = item
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    await $fetch('/api/admin/users/delete', { method: 'POST', body: { id: deleteTarget.value.id } })
    toast.add({ title: '删除成功', color: 'success' })
    deleteOpen.value = false
    await refresh()
  }
  catch (err: any) {
    toast.add({ title: err?.data?.message || '删除失败', color: 'error' })
  }
  finally {
    deleteLoading.value = false
  }
}

// Ban/Unban
async function toggleBan(item: any) {
  try {
    await $fetch('/api/admin/users/ban', {
      method: 'POST',
      body: { id: item.id, isBanned: !item.isBanned },
    })
    toast.add({ title: item.isBanned ? '已解封' : '已封禁', color: 'success' })
    await refresh()
  }
  catch (err: any) {
    toast.add({ title: '操作失败', color: 'error' })
  }
}

// Edit modal
const editOpen = ref(false)
const editTarget = ref<any>(null)
const editForm = reactive({ username: '', email: '', displayName: '', isActive: false })
const editLoading = ref(false)

function openEdit(item: any) {
  editTarget.value = item
  Object.assign(editForm, {
    username: item.username || '',
    email: item.email || '',
    displayName: item.displayName || '',
    isActive: item.isActive ?? false,
  })
  editOpen.value = true
}

async function submitEdit() {
  editLoading.value = true
  try {
    await $fetch('/api/admin/users/update', {
      method: 'PUT',
      body: { id: editTarget.value.id, ...editForm },
    })
    toast.add({ title: '更新成功', color: 'success' })
    editOpen.value = false
    await refresh()
  }
  catch (err: any) {
    toast.add({ title: err?.data?.message || '更新失败', color: 'error' })
  }
  finally {
    editLoading.value = false
  }
}

// API Keys modal
const keysOpen = ref(false)
const keysTarget = ref<any>(null)
const keysData = ref<any[]>([])
const keysLoading = ref(false)

async function openKeys(item: any) {
  keysTarget.value = item
  keysOpen.value = true
  keysLoading.value = true
  try {
    const res = await $fetch<any>('/api/admin/users/apikeys', { query: { userId: item.id } })
    keysData.value = res.data || []
  }
  catch { keysData.value = [] }
  finally { keysLoading.value = false }
}

async function addKey() {
  try {
    await $fetch('/api/admin/users/apikeys/add', { method: 'POST', body: { userId: keysTarget.value.id } })
    toast.add({ title: 'API Key 已创建', color: 'success' })
    await openKeys(keysTarget.value)
  }
  catch (err: any) { toast.add({ title: '创建失败', color: 'error' }) }
}

async function resetKey(id: number) {
  try {
    await $fetch('/api/admin/users/apikeys/reset', { method: 'POST', body: { id } })
    toast.add({ title: 'API Key 已重置', color: 'success' })
    await openKeys(keysTarget.value)
  }
  catch (err: any) { toast.add({ title: '重置失败', color: 'error' }) }
}

async function deleteKey(id: number) {
  try {
    await $fetch('/api/admin/users/apikeys/delete', { method: 'POST', body: { id } })
    toast.add({ title: 'API Key 已删除', color: 'success' })
    await openKeys(keysTarget.value)
  }
  catch (err: any) { toast.add({ title: '删除失败', color: 'error' }) }
}

function getRowItems(row: any): DropdownMenuItem[] {
  return [{
    label: '编辑',
    icon: 'i-mdi-pencil-outline',
    onSelect: () => openEdit(row),
  }, {
    label: row.isBanned ? '解封' : '封禁',
    icon: row.isBanned ? 'i-mdi-lock-open-outline' : 'i-mdi-lock-outline',
    onSelect: () => toggleBan(row),
  }, {
    label: 'API Keys',
    icon: 'i-mdi-key-variant',
    onSelect: () => openKeys(row),
  }, {
    type: 'separator',
  }, {
    label: '删除',
    icon: 'i-mdi-delete-outline',
    color: 'error' as const,
    onSelect: () => openDelete(row),
  }]
}

function formatDate(val: string) {
  if (!val) return '-'
  return new Date(val).toLocaleString('zh-CN', { hour12: false })
}

const columns: TableColumn<any>[] = [
  { accessorKey: 'username', header: '用户名' },
  { accessorKey: 'email', header: '邮箱' },
  { accessorKey: 'displayName', header: '显示名' },
  {
    accessorKey: 'isActive',
    header: '激活',
    cell: ({ row }) => h(UBadge, {
      color: row.original.isActive ? 'success' : 'neutral',
      variant: 'subtle',
    }, () => row.original.isActive ? '已激活' : '未激活'),
  },
  {
    accessorKey: 'isBanned',
    header: '封禁',
    cell: ({ row }) => row.original.isBanned
      ? h(UBadge, { color: 'error', variant: 'subtle' }, () => '已封禁')
      : null,
  },
  {
    accessorKey: 'createdAt',
    header: '注册时间',
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => h('div', { class: 'text-right' }, h(UDropdownMenu, {
      items: getRowItems(row.original),
      content: { align: 'end' },
    }, () => h(UButton, {
      icon: 'i-mdi-dots-vertical',
      color: 'neutral',
      variant: 'ghost',
      size: 'sm',
    }))),
  },
]
</script>

<template>
  <UDashboardPanel id="admin-users">
    <template #header>
      <UDashboardNavbar title="用户管理">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="mb-4">
        <UInput
          v-model="keyword"
          icon="i-mdi-magnify"
          placeholder="搜索用户名、邮箱..."
          class="max-w-xs"
        />
      </div>

      <UTable
        :data="items"
        :columns="columns"
        :loading="status === 'pending'"
        :ui="{
          base: 'table-fixed',
          thead: '[&>tr]:bg-elevated/50',
          th: 'py-2',
          td: 'py-2',
        }"
      />

      <!-- Edit Modal -->
      <UModal v-model:open="editOpen">
        <template #content>
          <div class="p-6">
            <h3 class="text-lg font-semibold mb-4">编辑用户</h3>
            <form class="space-y-3" @submit.prevent="submitEdit">
              <UFormField label="用户名">
                <UInput v-model="editForm.username" />
              </UFormField>
              <UFormField label="邮箱">
                <UInput v-model="editForm.email" type="email" />
              </UFormField>
              <UFormField label="显示名">
                <UInput v-model="editForm.displayName" />
              </UFormField>
              <USwitch v-model="editForm.isActive" label="已激活" />
              <div class="flex justify-end gap-2 pt-3">
                <UButton variant="outline" color="neutral" @click="editOpen = false">取消</UButton>
                <UButton type="submit" :loading="editLoading">保存</UButton>
              </div>
            </form>
          </div>
        </template>
      </UModal>

      <!-- API Keys Modal -->
      <UModal v-model:open="keysOpen">
        <template #content>
          <div class="p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold">{{ keysTarget?.username }} 的 API Keys</h3>
              <UButton size="sm" icon="i-mdi-plus" @click="addKey">新增</UButton>
            </div>
            <div v-if="keysLoading" class="text-sm text-muted py-4 text-center">加载中...</div>
            <div v-else-if="keysData.length === 0" class="text-sm text-muted py-4 text-center">暂无 API Key</div>
            <div v-else class="space-y-2">
              <div
                v-for="key in keysData"
                :key="key.id"
                class="flex items-center justify-between gap-2 rounded-lg border border-default p-3"
              >
                <div class="min-w-0">
                  <div class="text-sm font-medium">{{ key.name }}</div>
                  <div class="text-xs text-muted font-mono truncate">{{ key.apiKey }}</div>
                </div>
                <div class="flex gap-1 shrink-0">
                  <UButton size="xs" variant="outline" color="neutral" @click="resetKey(key.id)">重置</UButton>
                  <UButton size="xs" variant="outline" color="error" @click="deleteKey(key.id)">删除</UButton>
                </div>
              </div>
            </div>
          </div>
        </template>
      </UModal>

      <AdminAdminDeleteModal
        v-model:open="deleteOpen"
        :loading="deleteLoading"
        :title="`删除用户: ${deleteTarget?.username}`"
        description="删除用户后，其所有数据（API Keys、会话等）将被永久移除。"
        @confirm="confirmDelete"
      />
    </template>
  </UDashboardPanel>
</template>
```

- [ ] **Step 2: Verify user management**

Navigate to `/admin/users`. Verify table, search, edit modal, ban/unban, API key sub-modal (add/reset/delete), delete confirmation.

- [ ] **Step 3: Commit**

```bash
git add app/pages/admin/users.vue
git commit -m "feat(admin): add user management page with CRUD and API key management"
```

---

### Task 7: Friend Links Management

**Files:**
- Create: `app/components/admin/AdminLinkModal.vue`
- Create: `app/pages/admin/friend-links.vue`

- [ ] **Step 1: Create friend link modal**

Create `app/components/admin/AdminLinkModal.vue`:

```vue
<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ item?: any }>()
const emit = defineEmits<{ saved: [] }>()
const toast = useToast()

const isEdit = computed(() => !!props.item)

const schema = z.object({
  title: z.string().min(1, '必填'),
  url: z.string().min(1, '必填'),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({ title: '', url: '', description: '', isActive: true })
const loading = ref(false)

watch(() => props.item, (val) => {
  if (val) {
    Object.assign(state, { title: val.title || '', url: val.url || '', description: val.description || '', isActive: val.isActive ?? true })
  }
  else {
    Object.assign(state, { title: '', url: '', description: '', isActive: true })
  }
}, { immediate: true })

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    if (isEdit.value) {
      await $fetch('/api/admin/friend-links/update', { method: 'PUT', body: { id: props.item.id, ...event.data } })
    }
    else {
      await $fetch('/api/admin/friend-links/add', { method: 'POST', body: event.data })
    }
    toast.add({ title: isEdit.value ? '更新成功' : '创建成功', color: 'success' })
    open.value = false
    emit('saved')
  }
  catch (err: any) {
    toast.add({ title: err?.data?.message || '操作失败', color: 'error' })
  }
  finally { loading.value = false }
}
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <div class="p-6">
        <h3 class="text-lg font-semibold mb-4">{{ isEdit ? '编辑链接' : '新增链接' }}</h3>
        <UForm :schema="schema" :state="state" class="space-y-3" @submit="onSubmit">
          <UFormField label="标题" name="title">
            <UInput v-model="state.title" placeholder="站点名称" />
          </UFormField>
          <UFormField label="URL" name="url">
            <UInput v-model="state.url" placeholder="https://example.com" />
          </UFormField>
          <UFormField label="描述" name="description">
            <UTextarea v-model="state.description" :rows="3" />
          </UFormField>
          <USwitch v-model="state.isActive" label="启用" />
          <div class="flex justify-end gap-2 pt-3">
            <UButton variant="outline" color="neutral" @click="open = false">取消</UButton>
            <UButton type="submit" :loading="loading">{{ isEdit ? '保存' : '创建' }}</UButton>
          </div>
        </UForm>
      </div>
    </template>
  </UModal>
</template>
```

- [ ] **Step 2: Create friend links page**

Create `app/pages/admin/friend-links.vue`:

```vue
<script setup lang="ts">
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'

definePageMeta({ layout: 'admin', middleware: 'auth-admin' })

const toast = useToast()
const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const { data, status, refresh } = await useFetch('/api/admin/friend-links/list', {
  default: () => ({ code: 0, msg: '', data: [] }),
})
const items = computed(() => data.value?.data || [])

const modalOpen = ref(false)
const editItem = ref<any>(null)
const deleteOpen = ref(false)
const deleteTarget = ref<any>(null)
const deleteLoading = ref(false)

function openAdd() { editItem.value = null; modalOpen.value = true }
function openEdit(item: any) { editItem.value = item; modalOpen.value = true }
function openDelete(item: any) { deleteTarget.value = item; deleteOpen.value = true }

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    await $fetch('/api/admin/friend-links/delete', { method: 'POST', body: { id: deleteTarget.value.id } })
    toast.add({ title: '删除成功', color: 'success' })
    deleteOpen.value = false
    await refresh()
  }
  catch (err: any) { toast.add({ title: '删除失败', color: 'error' }) }
  finally { deleteLoading.value = false }
}

function getRowItems(row: any): DropdownMenuItem[] {
  return [
    { label: '编辑', icon: 'i-mdi-pencil-outline', onSelect: () => openEdit(row) },
    { label: '删除', icon: 'i-mdi-delete-outline', color: 'error' as const, onSelect: () => openDelete(row) },
  ]
}

const columns: TableColumn<any>[] = [
  { accessorKey: 'title', header: '标题' },
  { accessorKey: 'url', header: 'URL' },
  { accessorKey: 'description', header: '描述' },
  {
    accessorKey: 'isActive',
    header: '状态',
    cell: ({ row }) => h(UBadge, {
      color: row.original.isActive ? 'success' : 'neutral',
      variant: 'subtle',
    }, () => row.original.isActive ? '正常' : '停用'),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => h('div', { class: 'text-right' }, h(UDropdownMenu, {
      items: getRowItems(row.original),
      content: { align: 'end' },
    }, () => h(UButton, { icon: 'i-mdi-dots-vertical', color: 'neutral', variant: 'ghost', size: 'sm' }))),
  },
]
</script>

<template>
  <UDashboardPanel id="admin-friend-links">
    <template #header>
      <UDashboardNavbar title="友情链接">
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #right>
          <UButton icon="i-mdi-plus" @click="openAdd">新增链接</UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UTable :data="items" :columns="columns" :loading="status === 'pending'" :ui="{ base: 'table-fixed', thead: '[&>tr]:bg-elevated/50', th: 'py-2', td: 'py-2' }" />

      <AdminAdminLinkModal v-model:open="modalOpen" :item="editItem" @saved="refresh()" />
      <AdminAdminDeleteModal v-model:open="deleteOpen" :loading="deleteLoading" :title="`删除: ${deleteTarget?.title}`" @confirm="confirmDelete" />
    </template>
  </UDashboardPanel>
</template>
```

- [ ] **Step 3: Verify and commit**

```bash
git add app/components/admin/AdminLinkModal.vue app/pages/admin/friend-links.vue
git commit -m "feat(admin): add friend links management"
```

---

### Task 8: FAB Menu Management

**Files:**
- Create: `app/components/admin/AdminFabModal.vue`
- Create: `app/pages/admin/fab-menu.vue`

- [ ] **Step 1: Create FAB modal**

Create `app/components/admin/AdminFabModal.vue`:

```vue
<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ item?: any }>()
const emit = defineEmits<{ saved: [] }>()
const toast = useToast()

const isEdit = computed(() => !!props.item)

const schema = z.object({
  title: z.string().min(1, '必填'),
  subtitle: z.string().optional(),
  icon: z.string().default('mdi:link-variant'),
  actionType: z.string().default('link'),
  actionValue: z.string().min(1, '必填'),
  actionLabel: z.string().default('打开'),
  target: z.string().default('_blank'),
  sort: z.number().min(0).default(0),
  isActive: z.boolean().default(true),
})

type Schema = z.output<typeof schema>

const defaultState: Partial<Schema> = {
  title: '', subtitle: '', icon: 'mdi:link-variant', actionType: 'link',
  actionValue: '', actionLabel: '打开', target: '_blank', sort: 0, isActive: true,
}
const state = reactive<Partial<Schema>>({ ...defaultState })
const loading = ref(false)

watch(() => props.item, (val) => {
  if (val) {
    Object.assign(state, {
      title: val.title || '', subtitle: val.subtitle || '', icon: val.icon || 'mdi:link-variant',
      actionType: val.actionType || 'link', actionValue: val.actionValue || '',
      actionLabel: val.actionLabel || '打开', target: val.target || '_blank',
      sort: val.sort ?? 0, isActive: val.isActive ?? true,
    })
  }
  else { Object.assign(state, defaultState) }
}, { immediate: true })

const actionTypeOptions = [
  { label: '外部链接', value: 'link' },
  { label: '路由跳转', value: 'route' },
  { label: 'Iframe', value: 'iframe' },
]

const targetOptions = [
  { label: '新窗口', value: '_blank' },
  { label: '当前窗口', value: '_self' },
]

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    if (isEdit.value) {
      await $fetch('/api/admin/fab-menu/update', { method: 'PUT', body: { id: props.item.id, ...event.data } })
    }
    else {
      await $fetch('/api/admin/fab-menu/add', { method: 'POST', body: event.data })
    }
    toast.add({ title: isEdit.value ? '更新成功' : '创建成功', color: 'success' })
    open.value = false
    emit('saved')
  }
  catch (err: any) { toast.add({ title: err?.data?.message || '操作失败', color: 'error' }) }
  finally { loading.value = false }
}
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <div class="p-6 max-h-[80vh] overflow-y-auto">
        <h3 class="text-lg font-semibold mb-4">{{ isEdit ? '编辑菜单项' : '新增菜单项' }}</h3>
        <UForm :schema="schema" :state="state" class="space-y-3" @submit="onSubmit">
          <div class="grid grid-cols-2 gap-3">
            <UFormField label="标题" name="title">
              <UInput v-model="state.title" placeholder="菜单标题" />
            </UFormField>
            <UFormField label="副标题" name="subtitle">
              <UInput v-model="state.subtitle" placeholder="可选" />
            </UFormField>
          </div>
          <UFormField label="图标" name="icon">
            <UInput v-model="state.icon" placeholder="mdi:link-variant" />
          </UFormField>
          <div class="grid grid-cols-2 gap-3">
            <UFormField label="操作类型" name="actionType">
              <USelect v-model="state.actionType" :items="actionTypeOptions" />
            </UFormField>
            <UFormField label="打开方式" name="target">
              <USelect v-model="state.target" :items="targetOptions" />
            </UFormField>
          </div>
          <UFormField label="操作值" name="actionValue">
            <UInput v-model="state.actionValue" placeholder="URL 或路由路径" />
          </UFormField>
          <div class="grid grid-cols-2 gap-3">
            <UFormField label="按钮文字" name="actionLabel">
              <UInput v-model="state.actionLabel" placeholder="打开" />
            </UFormField>
            <UFormField label="排序" name="sort">
              <UInput v-model.number="state.sort" type="number" />
            </UFormField>
          </div>
          <USwitch v-model="state.isActive" label="启用" />
          <div class="flex justify-end gap-2 pt-3">
            <UButton variant="outline" color="neutral" @click="open = false">取消</UButton>
            <UButton type="submit" :loading="loading">{{ isEdit ? '保存' : '创建' }}</UButton>
          </div>
        </UForm>
      </div>
    </template>
  </UModal>
</template>
```

- [ ] **Step 2: Create FAB menu page**

Create `app/pages/admin/fab-menu.vue`:

```vue
<script setup lang="ts">
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'

definePageMeta({ layout: 'admin', middleware: 'auth-admin' })

const toast = useToast()
const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const { data, status, refresh } = await useFetch('/api/admin/fab-menu/list', {
  default: () => ({ code: 0, msg: '', data: [] }),
})
const items = computed(() => data.value?.data || [])

const modalOpen = ref(false)
const editItem = ref<any>(null)
const deleteOpen = ref(false)
const deleteTarget = ref<any>(null)
const deleteLoading = ref(false)

function openAdd() { editItem.value = null; modalOpen.value = true }
function openEdit(item: any) { editItem.value = item; modalOpen.value = true }
function openDelete(item: any) { deleteTarget.value = item; deleteOpen.value = true }

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    await $fetch('/api/admin/fab-menu/delete', { method: 'POST', body: { id: deleteTarget.value.id } })
    toast.add({ title: '删除成功', color: 'success' })
    deleteOpen.value = false
    await refresh()
  }
  catch (err: any) { toast.add({ title: '删除失败', color: 'error' }) }
  finally { deleteLoading.value = false }
}

function getRowItems(row: any): DropdownMenuItem[] {
  return [
    { label: '编辑', icon: 'i-mdi-pencil-outline', onSelect: () => openEdit(row) },
    { label: '删除', icon: 'i-mdi-delete-outline', color: 'error' as const, onSelect: () => openDelete(row) },
  ]
}

const columns: TableColumn<any>[] = [
  { accessorKey: 'title', header: '标题' },
  { accessorKey: 'subtitle', header: '副标题' },
  { accessorKey: 'icon', header: '图标' },
  { accessorKey: 'actionType', header: '类型' },
  { accessorKey: 'actionValue', header: '操作值' },
  { accessorKey: 'sort', header: '排序' },
  {
    accessorKey: 'isActive',
    header: '启用',
    cell: ({ row }) => h(UBadge, {
      color: row.original.isActive ? 'success' : 'neutral',
      variant: 'subtle',
    }, () => row.original.isActive ? '是' : '否'),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => h('div', { class: 'text-right' }, h(UDropdownMenu, {
      items: getRowItems(row.original),
      content: { align: 'end' },
    }, () => h(UButton, { icon: 'i-mdi-dots-vertical', color: 'neutral', variant: 'ghost', size: 'sm' }))),
  },
]
</script>

<template>
  <UDashboardPanel id="admin-fab-menu">
    <template #header>
      <UDashboardNavbar title="FAB 菜单">
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #right>
          <UButton icon="i-mdi-plus" @click="openAdd">新增菜单项</UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UTable :data="items" :columns="columns" :loading="status === 'pending'" :ui="{ base: 'table-fixed', thead: '[&>tr]:bg-elevated/50', th: 'py-2', td: 'py-2' }" />

      <AdminAdminFabModal v-model:open="modalOpen" :item="editItem" @saved="refresh()" />
      <AdminAdminDeleteModal v-model:open="deleteOpen" :loading="deleteLoading" :title="`删除: ${deleteTarget?.title}`" @confirm="confirmDelete" />
    </template>
  </UDashboardPanel>
</template>
```

- [ ] **Step 3: Verify and commit**

```bash
git add app/components/admin/AdminFabModal.vue app/pages/admin/fab-menu.vue
git commit -m "feat(admin): add FAB menu management"
```

---

### Task 9: Call Statistics Page

**Files:**
- Create: `app/pages/admin/calls.vue`

Read-only page with summary cards and call records table.

- [ ] **Step 1: Create call statistics page**

Create `app/pages/admin/calls.vue`:

```vue
<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

definePageMeta({ layout: 'admin', middleware: 'auth-admin' })

const UBadge = resolveComponent('UBadge')

const { data: statsData, refresh: refreshStats } = await useFetch('/api/admin/calls/stats', {
  default: () => ({ code: 0, msg: '', data: { total: 0, success: 0, failure: 0, items: [] } }),
})
const { data: callsData, status } = await useFetch('/api/admin/calls/list', {
  default: () => ({ code: 0, msg: '', data: [] }),
})

const stats = computed(() => statsData.value?.data || { total: 0, success: 0, failure: 0 })
const calls = computed(() => callsData.value?.data || [])

const successRate = computed(() => {
  if (!stats.value.total) return '0%'
  return `${((stats.value.success / stats.value.total) * 100).toFixed(1)}%`
})

const summaryCards = computed(() => [
  { label: '总调用', value: stats.value.total.toLocaleString() },
  { label: '成功', value: stats.value.success.toLocaleString() },
  { label: '失败', value: stats.value.failure.toLocaleString() },
  { label: '成功率', value: successRate.value },
])

function formatDate(val: string) {
  if (!val) return '-'
  return new Date(val).toLocaleString('zh-CN', { hour12: false })
}

const columns: TableColumn<any>[] = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'path', header: '路径' },
  {
    accessorKey: 'method',
    header: '方法',
    cell: ({ row }) => h(UBadge, { color: 'neutral', variant: 'outline' }, () => row.original.method),
  },
  { accessorKey: 'statusCode', header: '状态码' },
  {
    accessorKey: 'latencyMs',
    header: '耗时',
    cell: ({ row }) => `${row.original.latencyMs}ms`,
  },
  { accessorKey: 'ip', header: 'IP' },
  {
    accessorKey: 'createdAt',
    header: '时间',
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
]
</script>

<template>
  <UDashboardPanel id="admin-calls">
    <template #header>
      <UDashboardNavbar title="调用统计">
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #right>
          <UButton variant="outline" color="neutral" icon="i-mdi-refresh" @click="refreshStats()">
            刷新
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        <UCard v-for="card in summaryCards" :key="card.label" class="shadow-sm">
          <div class="px-1">
            <p class="text-xs text-muted">{{ card.label }}</p>
            <p class="text-xl font-semibold tabular-nums mt-0.5">{{ card.value }}</p>
          </div>
        </UCard>
      </div>

      <UTable
        :data="calls"
        :columns="columns"
        :loading="status === 'pending'"
        :ui="{
          base: 'table-fixed',
          thead: '[&>tr]:bg-elevated/50',
          th: 'py-2',
          td: 'py-2',
        }"
      />
    </template>
  </UDashboardPanel>
</template>
```

- [ ] **Step 2: Verify and commit**

```bash
git add app/pages/admin/calls.vue
git commit -m "feat(admin): add call statistics page"
```

---

### Task 10: Site Settings Page

**Files:**
- Create: `app/pages/admin/settings.vue`

Form page with sections for basic info, session config, and SMTP settings.

- [ ] **Step 1: Create settings page**

Create `app/pages/admin/settings.vue`:

```vue
<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth-admin' })

const toast = useToast()
const loading = ref(false)

const { data, refresh } = await useFetch('/api/admin/settings/get', {
  default: () => ({ code: 0, msg: '', data: null }),
})

const form = reactive({
  siteUrl: '',
  siteImg: '',
  siteName: '',
  siteDescription: '',
  startTime: '',
  sessionMaxAgeSeconds: 604800,
  emailVerifyExpiresInMinutes: 30,
  smtpHost: '',
  smtpPort: 465,
  smtpSecure: true,
  smtpUser: '',
  smtpPass: '',
  smtpFrom: '',
})

watch(() => data.value?.data, (val) => {
  if (val) {
    Object.assign(form, {
      siteUrl: val.siteUrl || '',
      siteImg: val.siteImg || '',
      siteName: val.siteName || '',
      siteDescription: val.siteDescription || '',
      startTime: val.startTime || '',
      sessionMaxAgeSeconds: val.sessionMaxAgeSeconds ?? 604800,
      emailVerifyExpiresInMinutes: val.emailVerifyExpiresInMinutes ?? 30,
      smtpHost: val.smtpHost || '',
      smtpPort: val.smtpPort ?? 465,
      smtpSecure: val.smtpSecure ?? true,
      smtpUser: val.smtpUser || '',
      smtpPass: val.smtpPass || '',
      smtpFrom: val.smtpFrom || '',
    })
  }
}, { immediate: true })

async function handleSave() {
  loading.value = true
  try {
    await $fetch('/api/admin/settings/update', { method: 'PUT', body: { ...form } })
    toast.add({ title: '设置已保存', color: 'success' })
    await refresh()
  }
  catch (err: any) {
    toast.add({ title: err?.data?.message || '保存失败', color: 'error' })
  }
  finally { loading.value = false }
}
</script>

<template>
  <UDashboardPanel id="admin-settings" :ui="{ body: 'lg:py-8' }">
    <template #header>
      <UDashboardNavbar title="站点设置">
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #right>
          <UButton :loading="loading" @click="handleSave">
            保存设置
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-6 w-full lg:max-w-2xl mx-auto">
        <UPageCard title="基本信息" description="站点名称、描述、头像等公开展示的信息" variant="subtle">
          <div class="space-y-4">
            <UFormField label="站点名称">
              <UInput v-model="form.siteName" />
            </UFormField>
            <UFormField label="站点描述">
              <UTextarea v-model="form.siteDescription" :rows="3" />
            </UFormField>
            <UFormField label="站点头像 URL">
              <UInput v-model="form.siteImg" />
            </UFormField>
            <UFormField label="站点地址">
              <UInput v-model="form.siteUrl" placeholder="https://api.example.com" />
            </UFormField>
            <UFormField label="起始运行时间">
              <UInput v-model="form.startTime" placeholder="2026-01-01 00:00:00" />
            </UFormField>
          </div>
        </UPageCard>

        <UPageCard title="会话配置" description="用户登录会话的有效期设置" variant="subtle">
          <div class="space-y-4">
            <UFormField label="会话有效期（秒）" description="默认 604800 秒 = 7 天">
              <UInput v-model.number="form.sessionMaxAgeSeconds" type="number" />
            </UFormField>
            <UFormField label="邮箱验证有效期（分钟）">
              <UInput v-model.number="form.emailVerifyExpiresInMinutes" type="number" />
            </UFormField>
          </div>
        </UPageCard>

        <UPageCard title="邮件 SMTP" description="用于发送邮箱验证等通知邮件" variant="subtle">
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <UFormField label="SMTP 主机">
                <UInput v-model="form.smtpHost" placeholder="smtp.example.com" />
              </UFormField>
              <UFormField label="端口">
                <UInput v-model.number="form.smtpPort" type="number" />
              </UFormField>
            </div>
            <USwitch v-model="form.smtpSecure" label="启用 SSL/TLS" />
            <div class="grid grid-cols-2 gap-3">
              <UFormField label="用户名">
                <UInput v-model="form.smtpUser" />
              </UFormField>
              <UFormField label="密码">
                <UInput v-model="form.smtpPass" type="password" />
              </UFormField>
            </div>
            <UFormField label="发件人地址">
              <UInput v-model="form.smtpFrom" placeholder="no-reply@example.com" />
            </UFormField>
          </div>
        </UPageCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
```

- [ ] **Step 2: Verify and commit**

```bash
git add app/pages/admin/settings.vue
git commit -m "feat(admin): add site settings page"
```

---

### Task 11: Verification Pass

- [ ] **Step 1: Full verification**

Run `pnpm dev` and verify ALL admin pages end-to-end:

1. `/admin/login` — login with admin credentials, redirect to `/admin`
2. `/admin` — overview cards show real stats, quick actions navigate correctly
3. `/admin/apis` — table loads, search works, add/edit/delete/toggle all functional
4. `/admin/users` — table loads, search, edit, ban/unban, API keys, delete
5. `/admin/friend-links` — table loads, add/edit/delete
6. `/admin/fab-menu` — table loads, add/edit/delete
7. `/admin/calls` — summary cards + table of call records
8. `/admin/settings` — form loads current values, save persists changes
9. Sidebar — all nav items highlight correctly, collapse/expand works
10. Auth guard — unauthenticated access to `/admin` redirects to `/admin/login`

- [ ] **Step 2: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(admin): address verification issues"
```

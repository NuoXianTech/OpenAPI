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

<script setup lang="ts">
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'

definePageMeta({ layout: 'user', middleware: 'auth-user' })

interface ApiKey {
  id: number
  name: string
  apiKey: string
  isActive: boolean
  totalCalls: number
  lastUsedAt: string | null
  lastUsedIp: string | null
  expiresAt: string | null
  createdAt: string
}

const toast = useToast()
const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const { data, status, refresh } = useLazyFetch<ApiKey[]>('/api/user/apikeys/list', {
  default: () => [],
})
const items = computed<ApiKey[]>(() => data.value || [])

// 创建
const createOpen = ref(false)
const newName = ref('')
const creating = ref(false)
const createdKey = ref<ApiKey | null>(null)

function openCreate() {
  newName.value = ''
  createdKey.value = null
  createOpen.value = true
}

async function submitCreate() {
  creating.value = true
  try {
    const res = await $fetch<ApiKey>('/api/user/apikeys/add', {
      method: 'POST',
      body: { name: newName.value.trim() || '默认密钥' },
    })
    createdKey.value = res || null
    toast.add({ title: '已生成新 API Key', color: 'success' })
    await refresh()
  }
  catch (err: unknown) {
    toast.add({ title: (err as { data?: { message?: string } })?.data?.message || '创建失败', color: 'error' })
  }
  finally {
    creating.value = false
  }
}

// 重置
const resetOpen = ref(false)
const resetTarget = ref<ApiKey | null>(null)
const resetLoading = ref(false)
const resetResult = ref<ApiKey | null>(null)

function openReset(row: ApiKey) {
  resetTarget.value = row
  resetResult.value = null
  resetOpen.value = true
}

async function confirmReset() {
  if (!resetTarget.value) return
  resetLoading.value = true
  try {
    const res = await $fetch<ApiKey>('/api/user/apikeys/reset', {
      method: 'POST',
      body: { id: resetTarget.value.id },
    })
    resetResult.value = res || null
    toast.add({ title: '已重置，旧 Key 立即失效', color: 'success' })
    await refresh()
  }
  catch (err: unknown) {
    toast.add({ title: (err as { data?: { message?: string } })?.data?.message || '重置失败', color: 'error' })
  }
  finally {
    resetLoading.value = false
  }
}

// 删除
const deleteOpen = ref(false)
const deleteTarget = ref<ApiKey | null>(null)
const deleteLoading = ref(false)

function openDelete(row: ApiKey) {
  deleteTarget.value = row
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    await $fetch('/api/user/apikeys/delete', {
      method: 'POST',
      body: { id: deleteTarget.value.id },
    })
    toast.add({ title: '已删除', color: 'success' })
    deleteOpen.value = false
    await refresh()
  }
  catch (err: unknown) {
    toast.add({ title: (err as { data?: { message?: string } })?.data?.message || '删除失败', color: 'error' })
  }
  finally {
    deleteLoading.value = false
  }
}

// 复制
async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.add({ title: '已复制到剪贴板', color: 'success' })
  }
  catch {
    toast.add({ title: '复制失败', color: 'error' })
  }
}

function maskKey(key: string) {
  if (!key || key.length <= 12) return key
  return `${key.slice(0, 8)}${'•'.repeat(8)}${key.slice(-4)}`
}

function formatDate(val: string | null) {
  if (!val) return '从未使用'
  return new Date(val).toLocaleString('zh-CN', { hour12: false })
}

function getRowItems(row: ApiKey): DropdownMenuItem[] {
  return [
    { label: '复制完整 Key', icon: 'i-mdi-content-copy', onSelect: () => copy(row.apiKey) },
    { label: '重置 Key', icon: 'i-mdi-refresh', onSelect: () => openReset(row) },
    { label: '删除', icon: 'i-mdi-delete-outline', color: 'error' as const, onSelect: () => openDelete(row) },
  ]
}

const showFullKeyId = ref<number | null>(null)
function toggleReveal(id: number) {
  showFullKeyId.value = showFullKeyId.value === id ? null : id
}

const columns: TableColumn<ApiKey>[] = [
  {
    accessorKey: 'name',
    header: '名称',
    cell: ({ row }) => h('span', { class: 'font-medium' }, row.original.name || '默认密钥'),
  },
  {
    accessorKey: 'apiKey',
    header: 'API Key',
    cell: ({ row }) => h('div', { class: 'flex items-center gap-2' }, [
      h('code', { class: 'font-mono text-xs px-2 py-1 rounded bg-elevated' },
        showFullKeyId.value === row.original.id ? row.original.apiKey : maskKey(row.original.apiKey)),
      h(UButton, {
        icon: showFullKeyId.value === row.original.id ? 'i-mdi-eye-off-outline' : 'i-mdi-eye-outline',
        size: 'xs',
        color: 'neutral',
        variant: 'ghost',
        onClick: () => toggleReveal(row.original.id),
      }),
      h(UButton, {
        icon: 'i-mdi-content-copy',
        size: 'xs',
        color: 'neutral',
        variant: 'ghost',
        onClick: () => copy(row.original.apiKey),
      }),
    ]),
  },
  {
    accessorKey: 'totalCalls',
    header: '调用次数',
    cell: ({ row }) => h('span', { class: 'tabular-nums' }, (row.original.totalCalls || 0).toLocaleString()),
  },
  {
    accessorKey: 'lastUsedAt',
    header: '最近使用',
    cell: ({ row }) => h('div', { class: 'flex flex-col text-xs' }, [
      h('span', formatDate(row.original.lastUsedAt)),
      row.original.lastUsedIp
        ? h('span', { class: 'text-muted font-mono' }, row.original.lastUsedIp)
        : null,
    ].filter(Boolean)),
  },
  {
    id: 'isActive',
    header: '状态',
    cell: ({ row }) => h(UBadge, {
      color: row.original.isActive ? 'success' : 'neutral',
      variant: 'subtle',
    }, () => row.original.isActive ? '启用' : '停用'),
  },
  {
    accessorKey: 'createdAt',
    header: '创建时间',
    cell: ({ row }) => h('span', { class: 'text-xs text-muted' }, formatDate(row.original.createdAt)),
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
  <UDashboardPanel id="user-apikeys">
    <template #header>
      <UDashboardNavbar title="API Key">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            icon="i-mdi-plus"
            @click="openCreate"
          >
            生成新 Key
          </UButton>
          <UButton
            icon="i-mdi-refresh"
            color="neutral"
            variant="outline"
            :loading="status === 'pending'"
            @click="refresh()"
          >
            刷新
          </UButton>
          <UserHeaderUser />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UCard class="shadow-sm mb-4">
        <div class="text-xs text-muted leading-6">
          <div>
            • 在请求 OpenAPI 接口时，把 API Key 放在请求头 <code class="font-mono px-1 rounded bg-elevated">x-api-key: &lt;your-key&gt;</code> 或 query 参数 <code class="font-mono px-1 rounded bg-elevated">?apiKey=&lt;your-key&gt;</code> 中。
          </div>
          <div>
            • 出于安全考虑，列表默认显示遮罩；点击眼睛图标可临时显示完整 Key，仅自己可见。
          </div>
          <div>
            • <strong>重置</strong>会立即让旧 Key 失效，请在重置后及时更新调用方代码。<strong>删除</strong>不可恢复。
          </div>
        </div>
      </UCard>

      <UTable
        :data="items"
        :columns="columns"
        :loading="status === 'pending'"
        :ui="{
          base: 'table-fixed',
          thead: '[&>tr]:bg-elevated/50',
          th: 'py-2',
          td: 'py-2 align-middle',
        }"
      />

      <!-- 创建 Key -->
      <UModal
        v-model:open="createOpen"
        :ui="{ content: 'sm:max-w-md' }"
      >
        <template #content>
          <div class="p-6">
            <h3 class="text-lg font-semibold mb-4">
              {{ createdKey ? '请保存你的新 Key' : '生成新 API Key' }}
            </h3>
            <template v-if="!createdKey">
              <UFormField label="名称（可选）">
                <UInput
                  v-model="newName"
                  placeholder="例如：默认密钥 / 生产密钥"
                />
              </UFormField>
              <div class="flex justify-end gap-2 mt-6">
                <UButton
                  variant="outline"
                  color="neutral"
                  @click="createOpen = false"
                >
                  取消
                </UButton>
                <UButton
                  :loading="creating"
                  @click="submitCreate"
                >
                  生成
                </UButton>
              </div>
            </template>
            <template v-else>
              <UAlert
                color="warning"
                variant="subtle"
                title="请立即复制并妥善保存"
                description="为了安全，关闭对话框后将仅显示遮罩。"
                icon="i-mdi-alert-outline"
                class="mb-4"
              />
              <code class="block font-mono text-sm break-all p-3 rounded bg-elevated">
                {{ createdKey.apiKey }}
              </code>
              <div class="flex justify-end gap-2 mt-6">
                <UButton
                  variant="outline"
                  color="neutral"
                  icon="i-mdi-content-copy"
                  @click="copy(createdKey.apiKey)"
                >
                  复制
                </UButton>
                <UButton @click="createOpen = false">
                  我已保存
                </UButton>
              </div>
            </template>
          </div>
        </template>
      </UModal>

      <!-- 重置 Key -->
      <UModal
        v-model:open="resetOpen"
        :ui="{ content: 'sm:max-w-md' }"
      >
        <template #content>
          <div class="p-6">
            <h3 class="text-lg font-semibold mb-4">
              {{ resetResult ? '已重置，请保存新 Key' : '确认重置 API Key' }}
            </h3>
            <template v-if="!resetResult">
              <UAlert
                color="warning"
                variant="subtle"
                title="重置将立即让旧 Key 失效"
                :description="`将重置「${resetTarget?.name || '默认密钥'}」，所有正在使用旧 Key 的调用方会立刻失败，请确认后再继续。`"
                icon="i-mdi-alert-outline"
                class="mb-4"
              />
              <div class="flex justify-end gap-2 mt-6">
                <UButton
                  variant="outline"
                  color="neutral"
                  @click="resetOpen = false"
                >
                  取消
                </UButton>
                <UButton
                  color="warning"
                  :loading="resetLoading"
                  @click="confirmReset"
                >
                  确认重置
                </UButton>
              </div>
            </template>
            <template v-else>
              <code class="block font-mono text-sm break-all p-3 rounded bg-elevated mb-4">
                {{ resetResult.apiKey }}
              </code>
              <div class="flex justify-end gap-2">
                <UButton
                  variant="outline"
                  color="neutral"
                  icon="i-mdi-content-copy"
                  @click="copy(resetResult.apiKey)"
                >
                  复制
                </UButton>
                <UButton @click="resetOpen = false">
                  我已保存
                </UButton>
              </div>
            </template>
          </div>
        </template>
      </UModal>

      <!-- 删除 Key -->
      <AdminDeleteModal
        v-model:open="deleteOpen"
        :loading="deleteLoading"
        :title="`删除 API Key: ${deleteTarget?.name || ''}`"
        description="删除后该 Key 立即失效且不可恢复。"
        @confirm="confirmDelete"
      />
    </template>
  </UDashboardPanel>
</template>

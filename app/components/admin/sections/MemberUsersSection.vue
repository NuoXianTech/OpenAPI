<script setup lang="ts">
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'
import { useAdminUsersPage, type AdminUserItem } from '~/composables/admin/useAdminUsersPage'

const toast = useToast()
const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UCheckbox = resolveComponent('UCheckbox')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const {
  keyword,
  status,
  items,
  refresh,
  selectedIds,
  allSelected,
  toggleSelect,
  toggleSelectAll,
  clearSelection,
  deleteUser,
  toggleBan,
  updateUser,
  errMsg
} = useAdminUsersPage()

const deleteOpen = ref(false)
const deleteTarget = ref<AdminUserItem | null>(null)
const deleteLoading = ref(false)

function openDelete(item: AdminUserItem) {
  deleteTarget.value = item
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    await deleteUser(deleteTarget.value.id)
    deleteOpen.value = false
  } catch (err) {
    toast.add({ title: errMsg(err, '删除失败'), color: 'error' })
  } finally {
    deleteLoading.value = false
  }
}

const editOpen = ref(false)
const editTarget = ref<AdminUserItem | null>(null)

function openEdit(item: AdminUserItem) {
  editTarget.value = item
  editOpen.value = true
}

const keysOpen = ref(false)
const keysTarget = ref<AdminUserItem | null>(null)

function openKeys(item: AdminUserItem) {
  keysTarget.value = item
  keysOpen.value = true
}

const creditOpen = ref(false)
const creditUserIds = ref<number[]>([])
const creditSelectionLabel = ref('')

function openCreditForOne(item: AdminUserItem) {
  creditUserIds.value = [item.id]
  creditSelectionLabel.value = `${item.username} (#${item.id})`
  creditOpen.value = true
}

function openCreditForSelection() {
  if (selectedIds.value.length === 0) {
    toast.add({ title: '请先勾选用户', color: 'warning' })
    return
  }
  creditUserIds.value = [...selectedIds.value]
  creditSelectionLabel.value = `已选 ${selectedIds.value.length} 个用户`
  creditOpen.value = true
}

function openCreditForAll() {
  creditUserIds.value = []
  creditSelectionLabel.value = '全部未删除用户'
  creditOpen.value = true
}

async function onCreditSaved() {
  clearSelection()
  await refresh()
}

function getRowItems(row: AdminUserItem): DropdownMenuItem[] {
  return [{
    label: '编辑',
    icon: 'i-mdi-pencil-outline',
    onSelect: () => openEdit(row)
  }, {
    label: row.isBanned ? '解封' : '封禁',
    icon: row.isBanned ? 'i-mdi-lock-open-outline' : 'i-mdi-lock-outline',
    onSelect: () => toggleBan(row)
  }, {
    label: 'API Keys',
    icon: 'i-mdi-key-variant',
    onSelect: () => openKeys(row)
  }, {
    label: '积分管理',
    icon: 'i-mdi-cash-multiple',
    onSelect: () => openCreditForOne(row)
  }, {
    type: 'separator'
  }, {
    label: '删除',
    icon: 'i-mdi-delete-outline',
    color: 'error' as const,
    onSelect: () => openDelete(row)
  }]
}

function formatDate(val: string) {
  if (!val) return '-'
  return new Date(val).toLocaleString('zh-CN', { hour12: false })
}

const columns: TableColumn<AdminUserItem>[] = [
  {
    id: 'select',
    header: '选',
    cell: ({ row }) => h(UCheckbox, {
      'modelValue': selectedIds.value.includes(row.original.id),
      'onUpdate:modelValue': (value: boolean | 'indeterminate') => toggleSelect(row.original.id, value === true)
    })
  },
  { accessorKey: 'username', header: '用户名' },
  { accessorKey: 'email', header: '邮箱' },
  { accessorKey: 'displayName', header: '显示名' },
  {
    accessorKey: 'credits',
    header: '积分',
    cell: ({ row }) => h(UBadge, {
      color: (row.original.credits ?? 0) > 0 ? 'success' : 'neutral',
      variant: 'subtle',
      class: 'tabular-nums font-mono'
    }, () => Number(row.original.credits ?? 0).toLocaleString())
  },
  {
    accessorKey: 'isActive',
    header: '激活',
    cell: ({ row }) => h(UBadge, {
      color: row.original.isActive ? 'success' : 'neutral',
      variant: 'subtle'
    }, () => row.original.isActive ? '已激活' : '未激活')
  },
  {
    accessorKey: 'isBanned',
    header: '封禁',
    cell: ({ row }) => row.original.isBanned
      ? h(UBadge, { color: 'error', variant: 'subtle' }, () => '已封禁')
      : null
  },
  {
    accessorKey: 'createdAt',
    header: '注册时间',
    cell: ({ row }) => formatDate(row.original.createdAt)
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => h('div', { class: 'text-right' }, h(UDropdownMenu, {
      items: getRowItems(row.original),
      content: { align: 'end' }
    }, () => h(UButton, {
      icon: 'i-mdi-dots-vertical',
      color: 'neutral',
      variant: 'ghost',
      size: 'sm'
    })))
  }
]
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center gap-2 flex-wrap">
      <UInput
        v-model="keyword"
        icon="i-mdi-magnify"
        placeholder="搜索用户名、邮箱..."
        class="max-w-sm"
      />
      <div class="ml-auto flex items-center gap-2 flex-wrap">
        <span class="text-xs text-muted">
          已选 {{ selectedIds.length }} / {{ items.length }}
        </span>
        <UButton
          size="sm"
          color="neutral"
          variant="outline"
          :icon="allSelected ? 'i-mdi-checkbox-multiple-blank-outline' : 'i-mdi-checkbox-multiple-marked-outline'"
          @click="toggleSelectAll(!allSelected)"
        >
          {{ allSelected ? '清空选择' : '全选当前页' }}
        </UButton>
        <UButton
          size="sm"
          color="primary"
          variant="outline"
          icon="i-mdi-cash-multiple"
          :disabled="selectedIds.length === 0"
          @click="openCreditForSelection"
        >
          批量调整积分
        </UButton>
        <UButton
          size="sm"
          color="warning"
          variant="outline"
          icon="i-mdi-cash-100"
          @click="openCreditForAll"
        >
          全员积分操作
        </UButton>
        <UButton
          size="sm"
          color="neutral"
          variant="outline"
          icon="i-mdi-refresh"
          :loading="status === 'pending'"
          @click="refresh"
        >
          刷新
        </UButton>
      </div>
    </div>

    <UTable
      :data="items"
      :columns="columns"
      :loading="status === 'pending'"
      :ui="{
        base: 'table-fixed',
        thead: '[&>tr]:bg-elevated/50',
        th: 'py-2',
        td: 'py-2'
      }"
    />

    <AdminUserEditModal
      v-model:open="editOpen"
      :target="editTarget"
      :on-submit="updateUser"
    />

    <AdminUserKeysModal
      v-model:open="keysOpen"
      :target="keysTarget"
    />

    <AdminCreditModal
      v-model:open="creditOpen"
      :user-ids="creditUserIds"
      :selection-label="creditSelectionLabel"
      @saved="onCreditSaved"
    />

    <AdminDeleteModal
      v-model:open="deleteOpen"
      :loading="deleteLoading"
      :title="`删除用户: ${deleteTarget?.username}`"
      description="删除用户后，其所有数据（API Keys、会话等）将被永久移除。"
      @confirm="confirmDelete"
    />
  </div>
</template>

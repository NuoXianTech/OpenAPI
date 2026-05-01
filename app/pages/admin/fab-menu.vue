<script setup lang="ts">
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'

definePageMeta({ layout: 'admin', middleware: 'auth-admin' })

const toast = useToast()
const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const { data, status, refresh } = useLazyFetch('/api/admin/fab-menu/list', {
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
  catch (err: any) {
    toast.add({ title: err?.data?.message || '删除失败', color: 'error' })
  }
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
  {
    accessorKey: 'icon',
    header: '图标',
    cell: ({ row }) => h('span', { class: 'text-xs text-muted font-mono' }, row.original.icon),
  },
  {
    accessorKey: 'actionType',
    header: '类型',
    cell: ({ row }) => h(UBadge, { color: 'neutral', variant: 'outline' }, () => row.original.actionType),
  },
  { accessorKey: 'actionValue', header: '动作值' },
  {
    accessorKey: 'sortOrder',
    header: '排序',
    cell: ({ row }) => h('span', { class: 'tabular-nums' }, row.original.sortOrder),
  },
  {
    accessorKey: 'isActive',
    header: '状态',
    cell: ({ row }) => h(UBadge, {
      color: row.original.isActive ? 'success' : 'neutral',
      variant: 'subtle',
    }, () => row.original.isActive ? '启用' : '停用'),
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
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            icon="i-mdi-plus"
            @click="openAdd"
          >
            新增菜单项
          </UButton>
          <AdminHeaderUser />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
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

      <AdminFabMenuModal
        v-model:open="modalOpen"
        :item="editItem"
        @saved="refresh()"
      />
      <AdminDeleteModal
        v-model:open="deleteOpen"
        :loading="deleteLoading"
        :title="`删除: ${deleteTarget?.title}`"
        @confirm="confirmDelete"
      />
    </template>
  </UDashboardPanel>
</template>

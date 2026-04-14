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

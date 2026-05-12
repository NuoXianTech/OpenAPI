<script setup lang="ts">
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'

definePageMeta({ layout: 'admin', middleware: 'auth-admin' })

interface Announcement {
  id: number
  title: string
  content: string
  level: 'info' | 'success' | 'warning' | 'critical'
  isPinned: boolean
  isEnabled: boolean
  startAt: string | null
  endAt: string | null
  linkUrl: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

const toast = useToast()
const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const { data, status, refresh } = useLazyFetch<Announcement[]>('/api/admin/announcements/list', {
  default: () => [],
})
const items = computed<Announcement[]>(() => data.value || [])

const modalOpen = ref(false)
const editItem = ref<Announcement | null>(null)
const deleteOpen = ref(false)
const deleteTarget = ref<Announcement | null>(null)
const deleteLoading = ref(false)

function openAdd() {
  editItem.value = null
  modalOpen.value = true
}
function openEdit(item: Announcement) {
  editItem.value = item
  modalOpen.value = true
}
function openDelete(item: Announcement) {
  deleteTarget.value = item
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    await $fetch('/api/admin/announcements/delete', {
      method: 'POST',
      body: { id: deleteTarget.value.id },
    })
    toast.add({ title: '删除成功', color: 'success' })
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

async function quickToggle(row: Announcement, field: 'isEnabled' | 'isPinned', value: boolean) {
  try {
    await $fetch('/api/admin/announcements/update', {
      method: 'PUT',
      body: { id: row.id, [field]: value },
    })
    await refresh()
  }
  catch (err: unknown) {
    toast.add({ title: (err as { data?: { message?: string } })?.data?.message || '操作失败', color: 'error' })
  }
}

function getRowItems(row: Announcement): DropdownMenuItem[] {
  return [
    { label: '编辑', icon: 'i-mdi-pencil-outline', onSelect: () => openEdit(row) },
    { label: '删除', icon: 'i-mdi-delete-outline', color: 'error' as const, onSelect: () => openDelete(row) },
  ]
}

const levelMeta: Record<Announcement['level'], { color: 'info' | 'success' | 'warning' | 'error', label: string }> = {
  info: { color: 'info', label: '公告' },
  success: { color: 'success', label: '通知' },
  warning: { color: 'warning', label: '提醒' },
  critical: { color: 'error', label: '紧急' },
}

function formatDate(iso: string | null) {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleString('zh-CN', { hour12: false })
  }
  catch {
    return iso
  }
}

const USwitch = resolveComponent('USwitch')

const columns: TableColumn<Announcement>[] = [
  {
    accessorKey: 'title',
    header: '标题',
    cell: ({ row }) => h('div', { class: 'flex items-center gap-2' }, [
      h(UBadge, {
        color: levelMeta[row.original.level].color,
        variant: 'subtle',
      }, () => levelMeta[row.original.level].label),
      h('span', { class: 'font-medium truncate max-w-[300px]' }, row.original.title),
      row.original.isPinned
        ? h(UBadge, { color: 'warning', variant: 'soft' }, () => '置顶')
        : null,
    ].filter(Boolean)),
  },
  {
    id: 'window',
    header: '生效窗口',
    cell: ({ row }) => h('div', { class: 'text-xs text-muted' }, [
      h('div', `开始：${formatDate(row.original.startAt)}`),
      h('div', `结束：${formatDate(row.original.endAt)}`),
    ]),
  },
  {
    accessorKey: 'sortOrder',
    header: '排序',
  },
  {
    id: 'isEnabled',
    header: '启用',
    cell: ({ row }) => h(USwitch, {
      'modelValue': row.original.isEnabled,
      'onUpdate:modelValue': (val: boolean) => quickToggle(row.original, 'isEnabled', val),
    }),
  },
  {
    id: 'isPinned',
    header: '置顶',
    cell: ({ row }) => h(USwitch, {
      'modelValue': row.original.isPinned,
      'onUpdate:modelValue': (val: boolean) => quickToggle(row.original, 'isPinned', val),
    }),
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
  <UDashboardPanel id="admin-announcements">
    <template #header>
      <UDashboardNavbar title="公告管理">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            icon="i-mdi-plus"
            @click="openAdd"
          >
            新建公告
          </UButton>
          <DashboardHeaderActions
            :on-refresh="refresh"
            :refreshing="status === 'pending'"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UTable
        :data="items"
        :columns="columns"
        :loading="status === 'pending'"
        class="shrink-0"
        :ui="{
          base: 'table-fixed',
          thead: '[&>tr]:bg-elevated/50',
          th: 'py-2',
          td: 'py-2 align-top',
        }"
      />

      <AdminAnnouncementModal
        v-model:open="modalOpen"
        :item="editItem"
        @saved="refresh()"
      />

      <AdminDeleteModal
        v-model:open="deleteOpen"
        :loading="deleteLoading"
        :title="`删除公告: ${deleteTarget?.title}`"
        description="删除后该公告不再展示，且不可恢复。"
        @confirm="confirmDelete"
      />
    </template>
  </UDashboardPanel>
</template>

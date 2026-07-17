<script setup lang="ts">
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'
import { parseFetchError } from '~/utils/client-error'
import { useClientPagination, PAGE_SIZE_ITEMS } from '~/composables/dashboard/use-client-pagination'
import { usePrivateResource } from '~/composables/dashboard/use-private-resource'

interface ApiCategoryItem {
  id: number
  code: string
  name: string
  description: string | null
  icon: string | null
  color: string | null
  parentId: number | null
  sortOrder: number
  isEnabled: boolean
  createdAt: string
  updatedAt: string
}

const toast = useToast()
const confirm = useConfirmDialog()
const { t } = useI18n()

const { data, loading, refresh } = usePrivateResource<ApiCategoryItem[]>({
  path: '/api/admin/api-categories/list',
  defaultData: () => []
})

const keyword = ref('')
const filteredData = computed(() => data.value.filter(item => isApiCategoryVisible(item)))
const { page, pageSize, total, paginated } = useClientPagination(filteredData, 10)

const modalOpen = ref(false)
const editItem = ref<ApiCategoryItem | null>(null)

watch(keyword, () => {
  page.value = 1
})

function isApiCategoryVisible(item: ApiCategoryItem): boolean {
  const normalizedKeyword = keyword.value.trim().toLowerCase()
  if (!normalizedKeyword) return true

  return item.code.toLowerCase().includes(normalizedKeyword)
    || item.name.toLowerCase().includes(normalizedKeyword)
    || (item.description || '').toLowerCase().includes(normalizedKeyword)
}

function openAdd() {
  editItem.value = null
  modalOpen.value = true
}
function openEdit(item: ApiCategoryItem) {
  editItem.value = item
  modalOpen.value = true
}
async function openDelete(item: ApiCategoryItem) {
  await confirm({
    title: t('admin.apis.categories.delete.title', { name: item.name }),
    description: t('admin.apis.categories.delete.description'),
    onConfirm: async () => {
      try {
        await $fetch('/api/admin/api-categories/delete', {
          method: 'POST',
          body: { id: item.id }
        })
        toast.add({ title: t('common.feedback.deleted'), color: 'success' })
        await refresh()
      } catch (err: unknown) {
        toast.add({ title: parseFetchError(err, t('common.feedback.deleteFailed')), color: 'error' })
        throw err
      }
    }
  })
}

async function quickToggle(row: ApiCategoryItem, value: boolean) {
  try {
    await $fetch('/api/admin/api-categories/update', {
      method: 'PUT',
      body: { id: row.id, isEnabled: value }
    })
    await refresh()
  } catch (err: unknown) {
    toast.add({ title: parseFetchError(err, t('common.feedback.operationFailed')), color: 'error' })
  }
}

function getRowItems(row: ApiCategoryItem): DropdownMenuItem[] {
  return [
    { label: t('common.actions.edit'), icon: 'i-mdi-pencil-outline', onSelect: () => openEdit(row) },
    { label: t('common.actions.delete'), icon: 'i-mdi-delete-outline', color: 'error' as const, onSelect: () => openDelete(row) }
  ]
}

const columns = computed<TableColumn<ApiCategoryItem>[]>(() => [
  { accessorKey: 'code', header: t('admin.apis.categories.columns.code') },
  { accessorKey: 'name', header: t('admin.apis.categories.columns.name') },
  { accessorKey: 'description', header: t('admin.apis.categories.columns.description') },
  { accessorKey: 'sortOrder', header: t('admin.apis.categories.columns.sortOrder') },
  { accessorKey: 'color', header: t('admin.apis.categories.columns.color') },
  { id: 'isEnabled', header: t('admin.apis.categories.columns.enabled') },
  { id: 'actions', header: '' }
])
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-2 flex-wrap">
      <UInput
        v-model="keyword"
        icon="i-mdi-magnify"
        :placeholder="$t('admin.apis.categories.searchPlaceholder')"
        class="w-full sm:w-64"
      />
      <div class="ml-auto flex items-center gap-2 flex-wrap">
        <UButton
          icon="i-mdi-plus"
          @click="openAdd"
        >
          {{ $t('admin.apis.categories.actions.create') }}
        </UButton>
        <UButton
          color="neutral"
          variant="outline"
          icon="i-mdi-refresh"
          :loading="loading"
          @click="refresh()"
        >
          {{ $t('common.actions.refresh') }}
        </UButton>
      </div>
    </div>

    <DashboardTableCard
      :title="$t('admin.apis.categories.listTitle')"
      icon="i-mdi-shape-outline"
      :total="total"
    >
      <DashboardDataTable
        v-model:page="page"
        v-model:page-size="pageSize"
        :data="paginated"
        :columns="columns"
        :loading="loading"
        :total="total"
        :page-size-items="PAGE_SIZE_ITEMS"
        :empty-title="$t('admin.apis.categories.empty')"
        empty-icon="i-mdi-shape-outline"
      >
        <template #code-cell="{ row }">
          <span class="font-mono text-xs">{{ row.original.code }}</span>
        </template>
        <template #name-cell="{ row }">
          <div class="flex items-center gap-2">
            <UIcon
              v-if="row.original.icon"
              :name="row.original.icon"
              class="size-4 text-muted"
            />
            <span class="font-medium">{{ row.original.name }}</span>
          </div>
        </template>
        <template #description-cell="{ row }">
          <span class="text-xs text-muted truncate max-w-[280px] block">{{ row.original.description || '-' }}</span>
        </template>
        <template #sortOrder-cell="{ row }">
          <span class="tabular-nums">{{ row.original.sortOrder }}</span>
        </template>
        <template #color-cell="{ row }">
          <UBadge
            v-if="row.original.color"
            variant="subtle"
            color="neutral"
          >
            {{ row.original.color }}
          </UBadge>
          <span
            v-else
            class="text-muted"
          >-</span>
        </template>
        <template #isEnabled-cell="{ row }">
          <USwitch
            :model-value="row.original.isEnabled"
            @update:model-value="(val: boolean) => quickToggle(row.original, val)"
          />
        </template>
        <template #actions-cell="{ row }">
          <div class="text-right">
            <UDropdownMenu
              :items="getRowItems(row.original)"
              :content="{ align: 'end' }"
            >
              <UButton
                icon="i-mdi-dots-vertical"
                color="neutral"
                variant="ghost"
                size="sm"
              />
            </UDropdownMenu>
          </div>
        </template>
      </DashboardDataTable>
    </DashboardTableCard>

    <LazyAdminApiCategoryModal
      v-if="modalOpen"
      v-model:open="modalOpen"
      :item="editItem"
      @saved="refresh()"
    />
  </div>
</template>

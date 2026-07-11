<script setup lang="ts">
import { parseFetchError } from '~/utils/client-error'
import {
  useAdminApisDisplayMeta,
  type AdminApiCategoryItem,
  type AdminDiscoveredApi,
  type AdminVersionGroup
} from '~/composables/admin/use-admin-display-meta'
import { useClientPagination, PAGE_SIZE_ITEMS } from '~/composables/dashboard/use-client-pagination'
import { usePrivateResource } from '~/composables/dashboard/use-private-resource'

const toast = useToast()

const { data, loading, refresh } = usePrivateResource<{ versions: AdminVersionGroup[] }>({
  path: '/api/admin/apis/discover',
  defaultData: () => ({ versions: [] })
})

const { data: categoriesData } = usePrivateResource<AdminApiCategoryItem[]>({
  path: '/api/admin/api-categories/list',
  defaultData: () => []
})

const versions = computed(() => data.value.versions)

const modalOpen = ref(false)
const modalMode = ref<'register' | 'edit'>('register')
const modalTarget = ref<AdminDiscoveredApi | null>(null)

function openRegister(row: AdminDiscoveredApi) {
  modalMode.value = 'register'
  modalTarget.value = row
  modalOpen.value = true
}

function openEdit(row: AdminDiscoveredApi) {
  modalMode.value = 'edit'
  modalTarget.value = row
  modalOpen.value = true
}

async function handleToggle(row: AdminDiscoveredApi, field: 'isEnabled' | 'isStatistics', value: boolean) {
  if (!row.registered) return
  if (field === 'isStatistics' && value && !row.registered.isEnabled) {
    toast.add({ title: '请先启用接口，再开启统计', color: 'warning' })
    return
  }
  try {
    await $fetch('/api/admin/apis/toggle', {
      method: 'PUT',
      body: { id: row.registered.id, field, value }
    })
    if (field === 'isEnabled' && !value && row.registered.isStatistics) {
      toast.add({ title: '已同时关闭调用统计', color: 'info' })
    }
    await refresh()
  } catch (err: unknown) {
    toast.add({ title: parseFetchError(err, '切换失败'), color: 'error' })
  }
}

async function resyncManifest(row: AdminDiscoveredApi) {
  try {
    await $fetch('/api/admin/apis/register', {
      method: 'POST',
      body: { pathVersion: row.pathVersion, code: row.code }
    })
    toast.add({ title: '已同步 manifest', color: 'success' })
    await refresh()
  } catch (err: unknown) {
    toast.add({ title: parseFetchError(err, '同步失败'), color: 'error' })
  }
}

const {
  activeVersion,
  keyword,
  filteredApis,
  versionItems,
  columns,
  categoryLabel,
  getRowItems
} = useAdminApisDisplayMeta({
  versions,
  categories: categoriesData,
  openRegister,
  openEdit,
  resyncManifest
})

const { page, pageSize, total, paginated } = useClientPagination(filteredApis, 10)
const firstVersion = computed(() => versionItems.value[0]?.value ?? '')
const activeFilterCount = computed(() => [
  !!firstVersion.value && activeVersion.value !== firstVersion.value
].filter(Boolean).length)

watch([keyword, activeVersion], () => {
  page.value = 1
})

function resetApiFilters() {
  if (!firstVersion.value) return
  activeVersion.value = firstVersion.value
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-2 flex-wrap">
      <UInput
        v-model="keyword"
        icon="i-mdi-magnify"
        placeholder="搜索 code / 名称..."
        class="w-full sm:w-64"
      />
      <AdminFilterPopover
        v-if="versionItems.length > 0"
        :active-count="activeFilterCount"
        @reset="resetApiFilters"
      >
        <UFormField label="版本">
          <USelect
            v-model="activeVersion"
            :items="versionItems"
            size="sm"
            class="w-full"
          />
        </UFormField>
      </AdminFilterPopover>
      <UButton
        class="w-full sm:ml-auto sm:w-auto"
        color="neutral"
        variant="outline"
        icon="i-mdi-refresh"
        :loading="loading"
        @click="refresh()"
      >
        刷新
      </UButton>
    </div>

    <div
      v-if="versions.length === 0 && !loading"
      class="text-center py-12 text-muted"
    >
      未发现任何 v{N} 版本目录。请在 server/routes/v1/ 下创建接口目录后重启 dev 服务。
    </div>

    <DashboardTableCard
      v-else
      title="接口列表"
      icon="i-mdi-api"
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
        empty-title="该版本暂无接口"
        empty-icon="i-mdi-api"
      >
        <template #code-cell="{ row }">
          <div class="flex flex-col gap-0.5">
            <div class="font-mono text-sm">
              {{ row.original.code }}
            </div>
            <div class="text-xs text-muted truncate max-w-[260px]">
              <template v-if="row.original.registered?.name">
                {{ row.original.registered.name }}
              </template>
              <span
                v-else
                class="italic opacity-60"
              >未登记</span>
            </div>
          </div>
        </template>
        <template #endpoints-cell="{ row }">
          <span
            v-if="row.original.endpoints.length === 0"
            class="text-xs text-muted italic"
          >代码已删除</span>
          <div
            v-else
            class="flex flex-col gap-1"
          >
            <div
              v-for="ep in row.original.endpoints"
              :key="`${ep.method}-${ep.apiPath}`"
              class="flex items-center gap-2"
            >
              <UBadge
                :color="httpMethodColor(ep.method)"
                variant="subtle"
                class="font-mono"
              >
                {{ ep.method }}
              </UBadge>
              <span
                class="font-mono text-xs"
                :class="ep.isDynamic ? 'text-primary' : ''"
              >{{ ep.apiPath }}</span>
            </div>
          </div>
        </template>
        <template #category-cell="{ row }">
          {{ categoryLabel(row.original) }}
        </template>
        <template #isEnabled-cell="{ row }">
          <USwitch
            v-if="row.original.registered"
            :model-value="row.original.registered.isEnabled"
            @update:model-value="(val: boolean) => handleToggle(row.original, 'isEnabled', val)"
          />
          <UBadge
            v-else
            color="neutral"
            variant="subtle"
          >
            默认停用
          </UBadge>
        </template>
        <template #isStatistics-cell="{ row }">
          <USwitch
            v-if="row.original.registered"
            :model-value="row.original.registered.isStatistics"
            :disabled="!row.original.registered.isEnabled && !row.original.registered.isStatistics"
            @update:model-value="(val: boolean) => handleToggle(row.original, 'isStatistics', val)"
          />
          <span
            v-else
            class="text-muted"
          >-</span>
        </template>
        <template #isApiKey-cell="{ row }">
          <UBadge
            v-if="row.original.registered"
            :color="row.original.registered.isApiKey ? 'warning' : 'neutral'"
            variant="subtle"
          >
            {{ row.original.registered.isApiKey ? '必需' : '可选' }}
          </UBadge>
          <span
            v-else
            class="text-muted"
          >-</span>
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

    <LazyAdminApiModal
      v-if="modalOpen"
      v-model:open="modalOpen"
      :mode="modalMode"
      :target="modalTarget"
      @saved="refresh()"
    />
  </div>
</template>

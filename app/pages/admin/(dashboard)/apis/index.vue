<script setup lang="ts">
import AdminApiEndpointSummary from '~/components/admin/AdminApiEndpointSummary.vue'
import { parseFetchError } from '~/utils/client-error'
import {
  useAdminApisDisplayMeta,
  type AdminApiCategoryItem,
  type AdminDiscoveredApi,
  type AdminVersionGroup
} from '~/composables/admin/use-admin-display-meta'
import { PAGE_SIZE_OPTIONS } from '~/constants/pagination'
import { useClientPagination } from '~/composables/dashboard/use-client-pagination'
import { usePrivateResource } from '~/composables/dashboard/use-private-resource'

const toast = useToast()
const { t } = useI18n()

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
const capabilitiesModalOpen = ref(false)
const capabilitiesModalTarget = ref<AdminDiscoveredApi | null>(null)

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

function openCapabilities(row: AdminDiscoveredApi) {
  capabilitiesModalTarget.value = row
  capabilitiesModalOpen.value = true
}

async function handleToggle(row: AdminDiscoveredApi, field: 'isEnabled' | 'isStatistics', value: boolean) {
  if (!row.registered) return
  if (field === 'isStatistics' && value && !row.registered.isEnabled) {
    toast.add({ title: t('admin.apis.registry.feedback.enableBeforeStatistics'), color: 'warning' })
    return
  }
  try {
    await $fetch('/api/admin/apis/toggle', {
      method: 'PUT',
      body: { id: row.registered.id, field, value }
    })
    if (field === 'isEnabled' && !value && row.registered.isStatistics) {
      toast.add({ title: t('admin.apis.registry.feedback.statisticsDisabled'), color: 'info' })
    }
    await refresh()
  } catch (err: unknown) {
    toast.add({ title: parseFetchError(err, t('admin.apis.registry.feedback.toggleFailed')), color: 'error' })
  }
}

async function resyncManifest(row: AdminDiscoveredApi) {
  try {
    await $fetch('/api/admin/apis/register', {
      method: 'POST',
      body: { pathVersion: row.pathVersion, code: row.code }
    })
    toast.add({ title: t('admin.apis.registry.feedback.synced'), color: 'success' })
    await refresh()
  } catch (err: unknown) {
    toast.add({ title: parseFetchError(err, t('admin.apis.registry.feedback.syncFailed')), color: 'error' })
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
  openCapabilities,
  resyncManifest
})

const { page, pageSize, total, paginated } = useClientPagination(filteredApis)
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
        :placeholder="$t('admin.apis.registry.searchPlaceholder')"
        class="w-full sm:w-64"
      />
      <AdminFilterPopover
        v-if="versionItems.length > 0"
        :active-count="activeFilterCount"
        @reset="resetApiFilters"
      >
        <UFormField :label="$t('admin.apis.registry.filters.version')">
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
        {{ $t('common.actions.refresh') }}
      </UButton>
    </div>

    <div
      v-if="versions.length === 0 && !loading"
      class="text-center py-12 text-muted"
    >
      {{ $t('admin.apis.registry.noVersions') }}
    </div>

    <DashboardTableCard
      v-else
      :title="$t('admin.apis.registry.listTitle')"
      icon="i-mdi-api"
    >
      <DashboardDataTable
        v-model:page="page"
        v-model:page-size="pageSize"
        :data="paginated"
        :columns="columns"
        :loading="loading"
        :total="total"
        :page-size-options="PAGE_SIZE_OPTIONS"
        :empty-title="$t('admin.apis.registry.empty')"
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
              >{{ $t('admin.apis.registry.statuses.unregistered') }}</span>
            </div>
          </div>
        </template>
        <template #endpoints-cell="{ row }">
          <span
            v-if="row.original.endpoints.length === 0"
            class="text-xs text-muted italic"
          >{{ $t('admin.apis.registry.statuses.codeDeleted') }}</span>
          <AdminApiEndpointSummary
            v-else
            :endpoints="row.original.endpoints"
          />
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
            {{ $t('admin.apis.registry.statuses.disabledByDefault') }}
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
            {{ row.original.registered.isApiKey
              ? $t('admin.apis.registry.apiKey.required')
              : $t('admin.apis.registry.apiKey.optional') }}
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

    <LazyAdminApiCapabilitiesModal
      v-if="capabilitiesModalOpen"
      v-model:open="capabilitiesModalOpen"
      :target="capabilitiesModalTarget"
    />
  </div>
</template>

<script setup lang="ts">
import { LazyApiKeyResetModal, LazyApiKeyRevealModal } from '#components'
import { parseFetchError } from '~/utils/client-error'
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import { useApiKeys } from '~/composables/api/use-api-keys'
import { useApiKeyForm } from '~/composables/api/use-api-key-form'
import { useApiKeyDisplay } from '~/composables/api/use-api-key-display'
import { PAGE_SIZE_OPTIONS } from '~/constants/pagination'
import { useClientPagination } from '~/composables/dashboard/use-client-pagination'
import { useDashboardColumnVisibility } from '~/composables/dashboard/use-dashboard-column-visibility'
import { usePrivateResource } from '~/composables/dashboard/use-private-resource'
import { adminModalUi } from '~/utils/admin-modal-ui'
import type { ApiKeyItem } from '#shared/types/api'

const { t, locale } = useI18n()

useHead({ title: () => t('user.apiKeys.title') })

const toast = useToast()
const { copyText } = useCopyFeedback()
const {
  getIpText,
  getQuotaText,
  getScopesText,
  getStatus,
  getStatusCode
} = useApiKeyDisplay()

const {
  data: items,
  loading,
  error,
  refresh
} = usePrivateResource<ApiKeyItem[]>({
  path: '/api/user/apikeys/list',
  defaultData: () => []
})

watch(error, (err) => {
  if (!err) return
  toast.add({ title: parseFetchError(err, t('user.apiKeys.loadFailed')), color: 'error' })
})

// 数据层：接口范围下拉 + CRUD（成功后自动 refresh 列表）
const {
  scopeSelectItems,
  scopeLabelMap,
  allScopes,
  ensureScopeOptions,
  create: createKeys,
  update: updateKey,
  reset: resetKey,
  remove: removeKey
} = useApiKeys({ scope: 'user', refresh })

// 创建与编辑各持一份表单状态（取代原先两套并行实现）
const {
  form: createFormState,
  reset: resetCreateForm,
  ipLineErrors: createIpLineErrors,
  error: createError,
  buildPayload: buildCreatePayload
} = useApiKeyForm()

const {
  form: editFormState,
  loadFrom: loadEditForm,
  preselectAllScopes: preselectEditScopes,
  ipLineErrors: editIpLineErrors,
  error: editError,
  buildPayload: buildEditPayload
} = useApiKeyForm()

// ------------------------------------------------------------
// 创建
// ------------------------------------------------------------
const createOpen = ref(false)
const creating = ref(false)

async function openCreate() {
  resetCreateForm()
  createOpen.value = true
  await ensureScopeOptions()
  // 默认 all 模式；预选全部作为切到 pick 时的起点
  createFormState.scopesSelected = [...allScopes.value]
}

async function submitCreate() {
  if (createError.value) {
    toast.add({ title: createError.value, color: 'warning' })
    return
  }
  creating.value = true
  try {
    const res = await createKeys({ ...buildCreatePayload(), count: createFormState.count })
    toast.add({
      title: res.count > 1
        ? t('user.apiKeys.createdMany', { count: res.count.toLocaleString(locale.value) })
        : t('user.apiKeys.createdOne'),
      color: 'success'
    })
    createOpen.value = false
  } catch (err) {
    toast.add({ title: parseFetchError(err, t('common.feedback.createFailed')), color: 'error' })
  } finally {
    creating.value = false
  }
}

// ------------------------------------------------------------
// 编辑
// ------------------------------------------------------------
const editOpen = ref(false)
const isEditing = ref(false)
const editTargetId = ref<number | null>(null)

async function openEdit(row: ApiKeyItem) {
  editTargetId.value = row.id
  loadEditForm(row)
  editOpen.value = true
  await ensureScopeOptions()
  preselectEditScopes(allScopes.value)
}

async function submitEdit() {
  if (!editTargetId.value) return
  if (editError.value) {
    toast.add({ title: editError.value, color: 'warning' })
    return
  }
  isEditing.value = true
  try {
    await updateKey(editTargetId.value, buildEditPayload())
    toast.add({ title: t('common.feedback.updated'), color: 'success' })
    editOpen.value = false
  } catch (err) {
    toast.add({ title: parseFetchError(err, t('common.feedback.updateFailed')), color: 'error' })
  } finally {
    isEditing.value = false
  }
}

// ------------------------------------------------------------
// 重置
// ------------------------------------------------------------
const overlay = useOverlay()
const resetModal = overlay.create(LazyApiKeyResetModal, { destroyOnClose: true })
const revealModal = overlay.create(LazyApiKeyRevealModal, { destroyOnClose: true })

function openReset(row: ApiKeyItem) {
  resetModal.open({
    target: row,
    onReset: resetKey
  })
}

function openReveal(row: ApiKeyItem) {
  revealModal.open({ target: row })
}

// ------------------------------------------------------------
// 删除 / 启停
// ------------------------------------------------------------
const confirm = useConfirmDialog()

async function toggleActive(row: ApiKeyItem) {
  try {
    await updateKey(row.id, { isActive: !row.isActive })
    toast.add({ title: row.isActive ? t('common.apiKeys.feedback.disabled') : t('common.apiKeys.feedback.enabled'), color: 'success' })
  } catch (err) {
    toast.add({ title: parseFetchError(err, t('common.feedback.operationFailed')), color: 'error' })
  }
}

async function openDelete(row: ApiKeyItem) {
  await confirm({
    title: t('common.apiKeys.delete.title', { name: row.name || t('common.apiKeys.defaultName') }),
    description: t('common.apiKeys.delete.description'),
    onConfirm: async () => {
      try {
        await removeKey(row.id)
        toast.add({ title: t('common.feedback.deleted'), color: 'success' })
      } catch (err) {
        toast.add({ title: parseFetchError(err, t('common.feedback.deleteFailed')), color: 'error' })
        throw err
      }
    }
  })
}

// ------------------------------------------------------------
// 展示辅助
// ------------------------------------------------------------
const columns = computed<TableColumn<ApiKeyItem>[]>(() => [
  { accessorKey: 'name', header: t('common.apiKeys.columns.name') },
  { accessorKey: 'apiKey', header: t('user.apiKeys.title') },
  { id: 'quota', header: t('common.apiKeys.columns.quota') },
  { id: 'scopes', header: t('common.apiKeys.columns.scopes') },
  { id: 'ipWhitelist', header: t('common.apiKeys.columns.ipWhitelist') },
  { accessorKey: 'totalCalls', header: t('common.apiKeys.columns.totalCalls') },
  { accessorKey: 'lastUsedAt', header: t('common.apiKeys.columns.lastUsedAt') },
  { accessorKey: 'createdAt', header: t('common.apiKeys.columns.createdAt') },
  { accessorKey: 'expiresAt', header: t('common.apiKeys.columns.expiresAt') },
  { id: 'status', header: t('common.apiKeys.columns.status') },
  { id: 'actions', header: '' }
])
const keyword = ref('')
const statusFilter = ref<'all' | 'enabled' | 'disabled' | 'expired'>('all')
const scopeFilter = ref<'all' | 'full' | 'limited'>('all')

const statusItems = computed(() => [
  { label: t('user.apiKeys.filters.allStatuses'), value: 'all' },
  { label: t('common.apiKeys.statuses.enabled'), value: 'enabled' },
  { label: t('common.apiKeys.statuses.disabled'), value: 'disabled' },
  { label: t('common.apiKeys.statuses.expired'), value: 'expired' }
])

const scopeFilterItems = computed(() => [
  { label: t('user.apiKeys.filters.allScopes'), value: 'all' },
  { label: t('common.apiKeys.scopes.all'), value: 'full' },
  { label: t('common.apiKeys.scopes.selected'), value: 'limited' }
])

const activeFilterCount = computed(() => [
  statusFilter.value !== 'all',
  scopeFilter.value !== 'all'
].filter(Boolean).length)

const filteredItems = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  return items.value.filter((item) => {
    const status = getStatus(item)
    const hasLimitedScopes = !!item.scopes?.length
    const matchesKeyword = !q || [
      item.name || t('common.apiKeys.defaultName'),
      item.apiKey,
      status.label,
      item.lastUsedIp || '',
      ...(item.scopes || []),
      ...(item.ipWhitelist || [])
    ].some(value => value.toLowerCase().includes(q))

    const matchesStatus = statusFilter.value === 'all'
      || statusFilter.value === getStatusCode(item)

    const matchesScope = scopeFilter.value === 'all'
      || (scopeFilter.value === 'full' && !hasLimitedScopes)
      || (scopeFilter.value === 'limited' && hasLimitedScopes)

    return matchesKeyword && matchesStatus && matchesScope
  })
})

const { page, pageSize, total, paginated } = useClientPagination(filteredItems)

const { columnVisibility, columnVisibilityItems } = useDashboardColumnVisibility(columns)
columnVisibility.value = {
  quota: false,
  scopes: false,
  ipWhitelist: false,
  expiresAt: false
}

watch([keyword, statusFilter, scopeFilter, pageSize], () => {
  page.value = 1
})

function resetFilters() {
  statusFilter.value = 'all'
  scopeFilter.value = 'all'
}

async function copy(text: string) {
  await copyText(text)
}

function getRowItems(row: ApiKeyItem): DropdownMenuItem[] {
  return [
    { label: t('common.apiKeys.actions.edit'), icon: 'i-mdi-pencil-outline', onSelect: () => openEdit(row) },
    { label: t('common.apiKeys.actions.view'), icon: 'i-mdi-eye-outline', onSelect: () => openReveal(row) },
    { label: t('common.apiKeys.actions.copy'), icon: 'i-mdi-content-copy', onSelect: () => copy(row.apiKey) },
    {
      label: row.isActive ? t('common.apiKeys.actions.disable') : t('common.apiKeys.actions.enable'),
      icon: row.isActive ? 'i-mdi-pause-circle-outline' : 'i-mdi-play-circle-outline',
      onSelect: () => toggleActive(row)
    },
    { label: t('common.apiKeys.actions.reset'), icon: 'i-mdi-refresh', onSelect: () => openReset(row) },
    {
      label: t('common.apiKeys.actions.delete'),
      icon: 'i-mdi-delete-outline',
      color: 'error',
      onSelect: () => openDelete(row)
    }
  ]
}
</script>

<template>
  <UDashboardPanel id="user-apikeys">
    <template #header>
      <DashboardPageNavbar :title="$t('user.apiKeys.title')" />
    </template>

    <template #body>
      <div class="dashboard-section-page space-y-6">
        <div class="flex flex-wrap items-center gap-2">
          <UInput
            v-model="keyword"
            icon="i-mdi-magnify"
            :placeholder="$t('user.apiKeys.searchPlaceholder')"
            class="w-full sm:w-72"
          />
          <AdminFilterPopover
            :active-count="activeFilterCount"
            @reset="resetFilters"
          >
            <UFormField :label="$t('common.apiKeys.columns.status')">
              <USelect
                v-model="statusFilter"
                :items="statusItems"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="$t('common.apiKeys.columns.scopes')">
              <USelect
                v-model="scopeFilter"
                :items="scopeFilterItems"
                class="w-full"
              />
            </UFormField>
          </AdminFilterPopover>

          <div class="ml-auto flex flex-wrap items-center gap-2">
            <UButton
              icon="i-mdi-plus"
              @click="openCreate"
            >
              {{ $t('user.apiKeys.createAction') }}
            </UButton>
            <UDropdownMenu
              :items="columnVisibilityItems"
              :content="{ align: 'end' }"
            >
              <UButton
                :label="$t('user.apiKeys.showColumns')"
                color="neutral"
                variant="outline"
                icon="i-mdi-view-column-outline"
              />
            </UDropdownMenu>
          </div>
        </div>

        <DashboardTableCard
          :title="$t('user.apiKeys.listTitle')"
          icon="i-mdi-key-outline"
        >
          <DashboardDataTable
            v-model:page="page"
            v-model:page-size="pageSize"
            v-model:column-visibility="columnVisibility"
            :data="paginated"
            :columns="columns"
            :loading="loading"
            :total="total"
            :page-size-options="PAGE_SIZE_OPTIONS"
            :fixed="false"
            :empty-title="$t('user.apiKeys.empty')"
            empty-icon="i-mdi-key-outline"
          >
            <template #name-cell="{ row }">
              <span class="font-medium">{{ row.original.name || $t('common.apiKeys.defaultName') }}</span>
            </template>

            <template #apiKey-cell="{ row }">
              <div class="flex min-w-0 items-center gap-1.5">
                <UTooltip
                  :text="maskApiKey(row.original.apiKey)"
                  :content="{ side: 'top' }"
                >
                  <code class="block w-48 min-w-0 truncate rounded-md border border-muted bg-muted px-2.5 py-1.5 font-mono text-xs text-toned">
                    {{ maskApiKey(row.original.apiKey) }}
                  </code>
                </UTooltip>
                <UButton
                  icon="i-mdi-eye-outline"
                  :aria-label="$t('common.apiKeys.actions.view')"
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  @click="openReveal(row.original)"
                />
                <UButton
                  icon="i-mdi-content-copy"
                  :aria-label="$t('common.apiKeys.actions.copy')"
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  @click="copy(row.original.apiKey)"
                />
              </div>
            </template>

            <template #quota-cell="{ row }">
              <span
                class="tabular-nums text-xs"
                :class="row.original.totalQuota === null ? 'text-muted' : ''"
              >{{ getQuotaText(row.original) }}</span>
            </template>

            <template #scopes-cell="{ row }">
              <UTooltip
                v-if="row.original.scopes && row.original.scopes.length > 0"
                :text="row.original.scopes.map(s => scopeLabelMap.get(s) || s).join('\n')"
                :content="{ side: 'top' }"
              >
                <UBadge
                  variant="soft"
                  color="neutral"
                  class="cursor-help"
                >
                  {{ getScopesText(row.original.scopes, scopeLabelMap) }}
                </UBadge>
              </UTooltip>
              <span
                v-else
                class="text-xs text-muted"
              >{{ $t('common.apiKeys.scopes.all') }}</span>
            </template>

            <template #ipWhitelist-cell="{ row }">
              <UTooltip
                v-if="row.original.ipWhitelist && row.original.ipWhitelist.length > 0"
                :text="row.original.ipWhitelist.join('\n')"
                :content="{ side: 'top' }"
              >
                <UBadge
                  variant="soft"
                  color="neutral"
                  class="cursor-help font-mono"
                >
                  {{ getIpText(row.original.ipWhitelist) }}
                </UBadge>
              </UTooltip>
              <span
                v-else
                class="text-xs text-muted"
              >{{ $t('common.apiKeys.display.allIps') }}</span>
            </template>

            <template #totalCalls-cell="{ row }">
              <span class="tabular-nums">{{ (row.original.totalCalls || 0).toLocaleString(locale) }}</span>
            </template>

            <template #lastUsedAt-cell="{ row }">
              <div class="flex flex-col text-xs">
                <span>{{ formatDateTime(row.original.lastUsedAt, $t('common.apiKeys.display.neverUsed'), locale) }}</span>
                <span
                  v-if="row.original.lastUsedIp"
                  class="text-muted font-mono"
                >{{ row.original.lastUsedIp }}</span>
              </div>
            </template>

            <template #createdAt-cell="{ row }">
              <span class="text-xs text-muted">{{ formatDateTime(row.original.createdAt, '-', locale) }}</span>
            </template>

            <template #expiresAt-cell="{ row }">
              <span
                class="text-xs"
                :class="isApiKeyExpired(row.original) ? 'text-warning' : 'text-muted'"
              >{{ formatDateTime(row.original.expiresAt, '—', locale) }}</span>
            </template>

            <template #status-cell="{ row }">
              <UBadge
                :color="getStatus(row.original).color"
                variant="subtle"
              >
                {{ getStatus(row.original).label }}
              </UBadge>
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
      </div>

      <!-- 创建 Key -->
      <UModal
        v-model:open="createOpen"
        :title="$t('user.apiKeys.createTitle')"
        :ui="adminModalUi({ content: 'sm:max-w-3xl' })"
      >
        <template #body>
          <ApiKeyFormFields
            v-model="createFormState"
            :scope-select-items="scopeSelectItems"
            :ip-line-errors="createIpLineErrors"
            :error="createError"
            show-count
            size="sm"
          />
        </template>

        <template #footer>
          <div class="flex justify-end gap-2 w-full">
            <UButton
              variant="outline"
              color="neutral"
              @click="() => { createOpen = false }"
            >
              {{ $t('common.actions.cancel') }}
            </UButton>
            <UButton
              :loading="creating"
              :disabled="!!createError"
              @click="submitCreate"
            >
              {{ $t('user.apiKeys.generate') }}
            </UButton>
          </div>
        </template>
      </UModal>

      <!-- 编辑 Key -->
      <UModal
        v-model:open="editOpen"
        :title="$t('user.apiKeys.editTitle')"
        :ui="adminModalUi({ content: 'sm:max-w-3xl' })"
      >
        <template #body>
          <ApiKeyFormFields
            v-model="editFormState"
            :scope-select-items="scopeSelectItems"
            :ip-line-errors="editIpLineErrors"
            :error="editError"
            editing
            size="sm"
          />
        </template>

        <template #footer>
          <div class="flex justify-end gap-2 w-full">
            <UButton
              variant="outline"
              color="neutral"
              @click="() => { editOpen = false }"
            >
              {{ $t('common.actions.cancel') }}
            </UButton>
            <UButton
              :loading="isEditing"
              :disabled="!!editError"
              @click="submitEdit"
            >
              {{ $t('common.actions.save') }}
            </UButton>
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>

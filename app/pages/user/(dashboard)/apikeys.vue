<script setup lang="ts">
import { LazyApiKeyResetModal } from '#components'
import { parseFetchError } from '~/utils/client-error'
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import { useApiKeys } from '~/composables/api/use-api-keys'
import { useApiKeyForm } from '~/composables/api/use-api-key-form'
import { usePrivateResource } from '~/composables/dashboard/use-private-resource'
import type { ApiKeyItem } from '#shared/types/api'

useHead({ title: 'API Keys' })

const toast = useToast()

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
  toast.add({ title: parseFetchError(err, '加载 API Key 失败'), color: 'error' })
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
      title: res.count > 1 ? `已生成 ${res.count} 个 API Key` : '已生成新 API Key',
      color: 'success'
    })
    createOpen.value = false
  } catch (err) {
    toast.add({ title: parseFetchError(err, '创建失败'), color: 'error' })
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
    toast.add({ title: '已更新', color: 'success' })
    editOpen.value = false
  } catch (err) {
    toast.add({ title: parseFetchError(err, '更新失败'), color: 'error' })
  } finally {
    isEditing.value = false
  }
}

// ------------------------------------------------------------
// 重置
// ------------------------------------------------------------
const overlay = useOverlay()
const resetModal = overlay.create(LazyApiKeyResetModal, { destroyOnClose: true })

function openReset(row: ApiKeyItem) {
  resetModal.open({
    target: row,
    onReset: resetKey
  })
}

// ------------------------------------------------------------
// 删除 / 启停
// ------------------------------------------------------------
const confirm = useConfirmDialog()

async function toggleActive(row: ApiKeyItem) {
  try {
    await updateKey(row.id, { isActive: !row.isActive })
    toast.add({ title: row.isActive ? '已停用' : '已启用', color: 'success' })
  } catch (err) {
    toast.add({ title: parseFetchError(err, '操作失败'), color: 'error' })
  }
}

async function openDelete(row: ApiKeyItem) {
  await confirm({
    title: `删除 API Key: ${row.name || ''}`,
    description: '删除后该 Key 立即失效且不可恢复。',
    onConfirm: async () => {
      try {
        await removeKey(row.id)
        toast.add({ title: '已删除', color: 'success' })
      } catch (err) {
        toast.add({ title: parseFetchError(err, '删除失败'), color: 'error' })
        throw err
      }
    }
  })
}

// ------------------------------------------------------------
// 展示辅助
// ------------------------------------------------------------
const columns: TableColumn<ApiKeyItem>[] = [
  { accessorKey: 'name', header: '名称' },
  { accessorKey: 'apiKey', header: 'API Key' },
  { id: 'quota', header: '配额（已用/总额）' },
  { id: 'scopes', header: '接口范围' },
  { id: 'ipWhitelist', header: 'IP 白名单' },
  { accessorKey: 'totalCalls', header: '调用次数' },
  { accessorKey: 'lastUsedAt', header: '最后使用' },
  { accessorKey: 'createdAt', header: '创建时间' },
  { accessorKey: 'expiresAt', header: '过期时间' },
  { id: 'status', header: '状态' },
  { id: 'actions', header: '' }
]
const showFullKeyId = ref<number | null>(null)

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.add({ title: '已复制到剪贴板', color: 'success' })
  } catch {
    toast.add({ title: '复制失败', color: 'error' })
  }
}

function toggleReveal(id: number) {
  showFullKeyId.value = showFullKeyId.value === id ? null : id
}

function getRowItems(row: ApiKeyItem): DropdownMenuItem[] {
  return [
    { label: '编辑配置', icon: 'i-lucide-pencil', onSelect: () => openEdit(row) },
    { label: '复制完整 Key', icon: 'i-lucide-copy', onSelect: () => copy(row.apiKey) },
    {
      label: row.isActive ? '停用' : '启用',
      icon: row.isActive ? 'i-lucide-circle-pause' : 'i-lucide-circle-play',
      onSelect: () => toggleActive(row)
    },
    { label: '重置 Key', icon: 'i-lucide-refresh-cw', onSelect: () => openReset(row) },
    {
      label: '删除',
      icon: 'i-lucide-trash-2',
      color: 'error',
      onSelect: () => openDelete(row)
    }
  ]
}
</script>

<template>
  <UDashboardPanel id="user-apikeys">
    <template #header>
      <UDashboardNavbar
        title="API Key"
        class="dashboard-navbar"
      >
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UserHeaderActions
            :on-refresh="refresh"
            :refreshing="loading"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="dashboard-section-page space-y-6">
        <UAlert
          color="info"
          variant="subtle"
          icon="i-lucide-info"
          title="API Key 使用说明"
          class="dashboard-gradient-alert"
        >
          <template #description>
            <ul class="space-y-1.5 text-xs leading-6 list-disc list-inside marker:text-muted">
              <li>
                请求时把 API Key 放在请求头 <UKbd>x-api-key: &lt;your-key&gt;</UKbd> 或 query 参数 <UKbd>?apikey=&lt;your-key&gt;</UKbd> 中。
              </li>
              <li>
                出于安全考虑，列表默认显示遮罩；点击眼睛图标可临时显示完整 Key，仅自己可见。
              </li>
              <li>
                <span class="font-medium text-highlighted">过期</span>的 Key 不会被删除或禁用，调用时会返回到期信息；<span class="font-medium text-highlighted">重置</span>会立即让旧 Key 失效；<span class="font-medium text-highlighted">删除</span>不可恢复。
              </li>
              <li>
                IP 白名单使用 CIDR 格式：单 IP 写成 <UKbd>1.2.3.4/32</UKbd>，网段写成 <UKbd>10.0.0.0/8</UKbd>。
              </li>
            </ul>
          </template>
        </UAlert>

        <div class="dashboard-action-bar flex justify-end">
          <UButton
            icon="i-lucide-plus"
            @click="openCreate"
          >
            生成新 Key
          </UButton>
        </div>

        <DashboardTableCard
          title="API Key 列表"
          icon="i-lucide-key-round"
          :total="items.length"
        >
          <DashboardDataTable
            :data="items"
            :columns="columns"
            :loading="loading"
            :fixed="false"
            empty-title="暂无 API Key"
            empty-icon="i-lucide-key-round"
          >
            <template #name-cell="{ row }">
              <span class="font-medium">{{ row.original.name || '默认密钥' }}</span>
            </template>

            <template #apiKey-cell="{ row }">
              <div class="flex items-center gap-2">
                <code class="font-mono text-xs px-2 py-1 rounded bg-elevated">
                  {{ showFullKeyId === row.original.id ? row.original.apiKey : maskApiKey(row.original.apiKey) }}
                </code>
                <UButton
                  :icon="showFullKeyId === row.original.id ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  @click="toggleReveal(row.original.id)"
                />
                <UButton
                  icon="i-lucide-copy"
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
              >{{ apiKeyQuotaText(row.original) }}</span>
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
                  {{ apiKeyScopesText(row.original.scopes, scopeLabelMap) }}
                </UBadge>
              </UTooltip>
              <span
                v-else
                class="text-xs text-muted"
              >全部接口</span>
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
                  {{ apiKeyIpText(row.original.ipWhitelist) }}
                </UBadge>
              </UTooltip>
              <span
                v-else
                class="text-xs text-muted"
              >全部 IP</span>
            </template>

            <template #totalCalls-cell="{ row }">
              <span class="tabular-nums">{{ (row.original.totalCalls || 0).toLocaleString() }}</span>
            </template>

            <template #lastUsedAt-cell="{ row }">
              <div class="flex flex-col text-xs">
                <span>{{ formatDateTime(row.original.lastUsedAt, '从未使用') }}</span>
                <span
                  v-if="row.original.lastUsedIp"
                  class="text-muted font-mono"
                >{{ row.original.lastUsedIp }}</span>
              </div>
            </template>

            <template #createdAt-cell="{ row }">
              <span class="text-xs text-muted">{{ formatDateTime(row.original.createdAt) }}</span>
            </template>

            <template #expiresAt-cell="{ row }">
              <span
                class="text-xs"
                :class="isApiKeyExpired(row.original) ? 'text-warning' : 'text-muted'"
              >{{ formatDateTime(row.original.expiresAt, '—') }}</span>
            </template>

            <template #status-cell="{ row }">
              <UBadge
                :color="apiKeyStatus(row.original).color"
                variant="subtle"
              >
                {{ apiKeyStatus(row.original).label }}
              </UBadge>
            </template>

            <template #actions-cell="{ row }">
              <DashboardRowActions :items="getRowItems(row.original)" />
            </template>
          </DashboardDataTable>
        </DashboardTableCard>
      </div>

      <!-- 创建 Key -->
      <UModal
        v-model:open="createOpen"
        title="生成新 API Key"
        :ui="{ content: 'sm:max-w-2xl' }"
      >
        <template #body>
          <ApiKeyFormFields
            v-model="createFormState"
            :scope-select-items="scopeSelectItems"
            :ip-line-errors="createIpLineErrors"
            :error="createError"
            show-count
            hints
          />
        </template>

        <template #footer>
          <div class="flex justify-end gap-2 w-full">
            <UButton
              variant="outline"
              color="neutral"
              @click="() => { createOpen = false }"
            >
              取消
            </UButton>
            <UButton
              :loading="creating"
              :disabled="!!createError"
              @click="submitCreate"
            >
              生成
            </UButton>
          </div>
        </template>
      </UModal>

      <!-- 编辑 Key -->
      <UModal
        v-model:open="editOpen"
        title="编辑 API Key"
        :ui="{ content: 'sm:max-w-2xl' }"
      >
        <template #body>
          <ApiKeyFormFields
            v-model="editFormState"
            :scope-select-items="scopeSelectItems"
            :ip-line-errors="editIpLineErrors"
            :error="editError"
            editing
            hints
          />
        </template>

        <template #footer>
          <div class="flex justify-end gap-2 w-full">
            <UButton
              variant="outline"
              color="neutral"
              @click="() => { editOpen = false }"
            >
              取消
            </UButton>
            <UButton
              :loading="isEditing"
              :disabled="!!editError"
              @click="submitEdit"
            >
              保存
            </UButton>
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>

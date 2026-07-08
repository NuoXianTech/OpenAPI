<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import {
  useAdminUsersDisplayMeta,
  useAdminUsersPage,
  type AdminUserItem
} from '~/composables/admin/use-admin-users-page'
import { useClientPagination, PAGE_SIZE_ITEMS } from '~/composables/dashboard/use-client-pagination'

useHead({ title: '用户管理' })

const {
  keyword,
  loading,
  items,
  refresh,
  rowSelection,
  selectedIds,
  clearSelection,
  requireSelection,
  deleteUser,
  banUser,
  unbanUser,
  updateUser,
  createUser
} = useAdminUsersPage()

const { page, pageSize, total, paginated } = useClientPagination(items, 10)
watch([keyword, pageSize], () => {
  page.value = 1
  clearSelection()
})

const columnVisibility = ref<Record<string, boolean>>({})
const confirm = useConfirmDialog()

async function openDelete(item: AdminUserItem) {
  await confirm({
    title: `删除用户: ${item.username}`,
    description: '删除用户后，其所有数据（API Keys、会话等）将被永久移除。',
    onConfirm: async () => {
      const ok = await deleteUser(item.id)
      if (!ok) throw new Error('delete failed')
    }
  })
}

const banOpen = ref(false)
const banTarget = ref<AdminUserItem | null>(null)

function openBan(item: AdminUserItem) {
  banTarget.value = item
  banOpen.value = true
}

async function openUnban(item: AdminUserItem) {
  await confirm({
    title: `解封用户: ${item.username}`,
    description: '解封后该用户可立即重新登录。',
    onConfirm: () => unbanUser(item)
  })
}

const editOpen = ref(false)
const editTarget = ref<AdminUserItem | null>(null)

function openEdit(item: AdminUserItem) {
  editTarget.value = item
  editOpen.value = true
}

const createOpen = ref(false)

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
  if (!requireSelection()) return
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

const {
  columns,
  banTooltip,
  getRowItems
} = useAdminUsersDisplayMeta({
  openEdit,
  openBan,
  openUnban,
  openKeys,
  openCreditForOne,
  openDelete
})

interface ToggleableColumn {
  id: string
  header: string
}

function readUserColumn(column: TableColumn<AdminUserItem>): ToggleableColumn | undefined {
  const header = 'header' in column && typeof column.header === 'string' ? column.header : ''
  if (!header) return undefined

  const id = 'id' in column && typeof column.id === 'string'
    ? column.id
    : 'accessorKey' in column
      ? String(column.accessorKey)
      : ''
  if (!id) return undefined

  return { id, header }
}

const columnVisibilityItems = computed<DropdownMenuItem[]>(() =>
  columns
    .map(readUserColumn)
    .filter((column): column is ToggleableColumn => column != null)
    .map(column => ({
      label: column.header,
      type: 'checkbox' as const,
      checked: columnVisibility.value[column.id] !== false,
      onUpdateChecked(checked: boolean) {
        columnVisibility.value = { ...columnVisibility.value, [column.id]: checked }
      },
      onSelect(event: Event) {
        event.preventDefault()
      }
    }))
)
</script>

<template>
  <UDashboardPanel id="admin-users">
    <template #header>
      <UDashboardNavbar
        title="用户管理"
        class="dashboard-navbar"
      >
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <DashboardHeaderActions />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="dashboard-section-page space-y-6">
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
              color="primary"
              icon="i-mdi-account-plus-outline"
              @click="() => { createOpen = true }"
            >
              添加用户
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
            <UDropdownMenu
              :items="columnVisibilityItems"
              :content="{ align: 'end' }"
            >
              <UButton
                label="显示列"
                color="neutral"
                variant="outline"
                icon="i-mdi-view-column-outline"
              />
            </UDropdownMenu>
            <UButton
              size="sm"
              color="neutral"
              variant="outline"
              icon="i-mdi-refresh"
              :loading="loading"
              @click="() => refresh()"
            >
              刷新
            </UButton>
          </div>
        </div>

        <DashboardTableCard
          title="用户列表"
          icon="i-mdi-account-group-outline"
          :total="total"
        >
          <DashboardDataTable
            v-model:page="page"
            v-model:page-size="pageSize"
            v-model:row-selection="rowSelection"
            v-model:column-visibility="columnVisibility"
            :data="paginated"
            :columns="columns"
            :loading="loading"
            :total="total"
            :page-size-items="PAGE_SIZE_ITEMS"
            :get-row-id="(row: AdminUserItem) => String(row.id)"
            empty-title="暂无用户"
            empty-icon="i-mdi-account-off-outline"
          >
            <template #select-header="{ table }">
              <UCheckbox
                :model-value="table.getIsSomePageRowsSelected() ? 'indeterminate' : table.getIsAllPageRowsSelected()"
                @update:model-value="(value: boolean | 'indeterminate') => table.toggleAllPageRowsSelected(value === true)"
              />
            </template>
            <template #select-cell="{ row }">
              <UCheckbox
                :model-value="row.getIsSelected()"
                @update:model-value="(value: boolean | 'indeterminate') => row.toggleSelected(value === true)"
              />
            </template>
            <template #credits-cell="{ row }">
              <UBadge
                :color="Number(row.original.credits ?? 0) > 0 ? 'success' : 'neutral'"
                variant="subtle"
                class="tabular-nums font-mono"
              >
                {{ Number(row.original.credits ?? 0).toLocaleString() }}
              </UBadge>
            </template>
            <template #role-cell="{ row }">
              <UBadge
                :color="row.original.role === 'admin' ? 'primary' : 'neutral'"
                variant="subtle"
                :icon="row.original.role === 'admin' ? 'i-mdi-shield-crown-outline' : 'i-mdi-account-outline'"
              >
                {{ row.original.role === 'admin' ? '管理员' : '普通用户' }}
              </UBadge>
            </template>
            <template #isActive-cell="{ row }">
              <UBadge
                :color="row.original.isActive ? 'success' : 'neutral'"
                variant="subtle"
              >
                {{ row.original.isActive ? '已激活' : '未激活' }}
              </UBadge>
            </template>
            <template #isBanned-cell="{ row }">
              <UTooltip
                v-if="row.original.isBanned"
                :text="banTooltip(row.original)"
                :content="{ side: 'top' }"
              >
                <UBadge
                  color="error"
                  variant="subtle"
                  :icon="row.original.bannedUntil ? 'i-mdi-clock-alert-outline' : 'i-mdi-lock'"
                >
                  {{ row.original.bannedUntil ? `封禁至 ${formatDateTime(row.original.bannedUntil)}` : '永久封禁' }}
                </UBadge>
              </UTooltip>
              <UBadge
                v-else
                color="success"
                variant="subtle"
              >
                未封禁
              </UBadge>
            </template>
            <template #createdAt-cell="{ row }">
              {{ formatDateTime(row.original.createdAt) }}
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

        <AdminUserEditModal
          v-model:open="editOpen"
          :target="editTarget"
          :on-submit="updateUser"
        />

        <AdminUserBanModal
          v-model:open="banOpen"
          :target="banTarget"
          :on-submit="banUser"
        />

        <AdminUserCreateModal
          v-model:open="createOpen"
          :on-submit="createUser"
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
      </div>
    </template>
  </UDashboardPanel>
</template>

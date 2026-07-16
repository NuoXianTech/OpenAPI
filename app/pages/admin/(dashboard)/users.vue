<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import {
  ADMIN_USER_ACTIVE_FILTER_OPTIONS,
  ADMIN_USER_BAN_FILTER_OPTIONS,
  ADMIN_USER_ROLE_FILTER_OPTIONS,
  useAdminUsersDisplayMeta,
  useAdminUsersPage,
  type AdminUserItem
} from '~/composables/admin/use-admin-users-page'
import { useClientPagination, PAGE_SIZE_ITEMS } from '~/composables/dashboard/use-client-pagination'

useHead({ title: '用户管理' })

const {
  keyword,
  userIdFilter,
  roleFilter,
  activeFilter,
  banFilter,
  activeFilterCount,
  resetFilters,
  loading,
  items,
  refresh,
  deleteUser,
  banUser,
  unbanUser,
  updateUser,
  createUser
} = useAdminUsersPage()

const { page, pageSize, total, paginated } = useClientPagination(items, 20)
watch([keyword, userIdFilter, roleFilter, activeFilter, banFilter, pageSize], () => {
  page.value = 1
})

const columnVisibility = ref<Record<string, boolean>>({})
const confirm = useConfirmDialog()

async function openDelete(item: AdminUserItem) {
  await confirm({
    title: `删除用户: ${item.username}`,
    description: '删除用户后，其所有数据（API 密钥、会话等）将被永久移除。',
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

const {
  columns,
  banTooltip,
  getRowItems
} = useAdminUsersDisplayMeta({
  openEdit,
  openBan,
  openUnban,
  openKeys,
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
      <DashboardPageNavbar title="用户管理" />
    </template>

    <template #body>
      <div class="dashboard-section-page space-y-6">
        <div class="flex items-center gap-2 flex-wrap">
          <UInput
            v-model="keyword"
            icon="i-mdi-magnify"
            placeholder="搜索用户名、邮箱或昵称"
            class="w-full sm:w-64"
          />
          <AdminFilterPopover
            :active-count="activeFilterCount"
            title="用户筛选"
            @reset="resetFilters"
          >
            <UFormField
              label="用户 ID"
              hint="精确匹配"
            >
              <UInput
                v-model.number="userIdFilter"
                type="number"
                inputmode="numeric"
                :min="1"
                :step="1"
                placeholder="输入用户 ID"
                class="w-full"
              />
            </UFormField>
            <UFormField label="角色">
              <USelect
                v-model="roleFilter"
                :items="ADMIN_USER_ROLE_FILTER_OPTIONS"
                value-key="value"
                class="w-full"
              />
            </UFormField>
            <UFormField label="激活状态">
              <USelect
                v-model="activeFilter"
                :items="ADMIN_USER_ACTIVE_FILTER_OPTIONS"
                value-key="value"
                class="w-full"
              />
            </UFormField>
            <UFormField label="封禁状态">
              <USelect
                v-model="banFilter"
                :items="ADMIN_USER_BAN_FILTER_OPTIONS"
                value-key="value"
                class="w-full"
              />
            </UFormField>
          </AdminFilterPopover>
          <div class="ml-auto flex items-center gap-2 flex-wrap">
            <UButton
              color="primary"
              icon="i-mdi-account-plus-outline"
              @click="() => { createOpen = true }"
            >
              添加用户
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
                {{ row.original.role === 'admin' ? '管理员' : '用户' }}
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
                  />
                </UDropdownMenu>
              </div>
            </template>
          </DashboardDataTable>
        </DashboardTableCard>

        <LazyAdminUserEditModal
          v-if="editOpen"
          v-model:open="editOpen"
          :target="editTarget"
          :on-submit="updateUser"
        />

        <LazyAdminUserBanModal
          v-if="banOpen"
          v-model:open="banOpen"
          :target="banTarget"
          :on-submit="banUser"
        />

        <LazyAdminUserCreateModal
          v-if="createOpen"
          v-model:open="createOpen"
          :on-submit="createUser"
        />

        <LazyAdminUserKeysModal
          v-if="keysOpen"
          v-model:open="keysOpen"
          :target="keysTarget"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>

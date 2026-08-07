<script setup lang="ts">
import {
  useAdminUsersDisplayMeta,
  useAdminUsersPage,
  type AdminUserItem
} from '~/composables/admin/use-admin-users-page'
import { PAGE_SIZE_OPTIONS } from '~/constants/pagination'
import { useDashboardColumnVisibility } from '~/composables/dashboard/use-dashboard-column-visibility'

const { t, locale } = useI18n()
useHead({ title: () => t('admin.users.title') })

const {
  keyword,
  userIdFilter,
  roleFilter,
  activeFilter,
  banFilter,
  activeFilterCount,
  applyFilters,
  resetFilters,
  page,
  pageSize,
  total,
  loading,
  items,
  refresh,
  deleteUser,
  banUser,
  unbanUser,
  updateUser,
  createUser
} = useAdminUsersPage()

const confirm = useConfirmDialog()

async function openDelete(item: AdminUserItem) {
  await confirm({
    title: t('admin.users.delete.title', { username: item.username }),
    description: t('admin.users.delete.description'),
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
    title: t('admin.users.unban.title', { username: item.username }),
    description: t('admin.users.unban.description'),
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
  roleFilterOptions,
  activeFilterOptions,
  banFilterOptions,
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

const { columnVisibility, columnVisibilityItems } = useDashboardColumnVisibility(columns)
</script>

<template>
  <UDashboardPanel id="admin-users">
    <template #header>
      <DashboardPageNavbar :title="$t('admin.users.title')" />
    </template>

    <template #body>
      <div class="dashboard-section-page space-y-6">
        <div class="flex items-center gap-2 flex-wrap">
          <UInput
            v-model="keyword"
            icon="i-mdi-magnify"
            :placeholder="$t('admin.users.searchPlaceholder')"
            class="w-full sm:w-64"
            @keyup.enter="applyFilters"
          />
          <AdminFilterPopover
            :active-count="activeFilterCount"
            :title="$t('admin.users.filterTitle')"
            @apply="applyFilters"
            @reset="resetFilters"
          >
            <UFormField
              :label="$t('admin.users.filters.userId')"
              :hint="$t('admin.users.filters.exactMatch')"
            >
              <UInput
                v-model.number="userIdFilter"
                type="number"
                inputmode="numeric"
                :min="1"
                :step="1"
                :placeholder="$t('admin.users.filters.userIdPlaceholder')"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="$t('admin.users.filters.role')">
              <USelect
                v-model="roleFilter"
                :items="roleFilterOptions"
                value-key="value"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="$t('admin.users.filters.activeStatus')">
              <USelect
                v-model="activeFilter"
                :items="activeFilterOptions"
                value-key="value"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="$t('admin.users.filters.banStatus')">
              <USelect
                v-model="banFilter"
                :items="banFilterOptions"
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
              {{ $t('admin.users.actions.add') }}
            </UButton>
            <UDropdownMenu
              :items="columnVisibilityItems"
              :content="{ align: 'end' }"
            >
              <UButton
                :label="$t('admin.users.actions.showColumns')"
                color="neutral"
                variant="outline"
                icon="i-mdi-view-column-outline"
              />
            </UDropdownMenu>
            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-refresh-cw"
              :loading="loading"
              @click="() => refresh()"
            >
              {{ $t('common.actions.refresh') }}
            </UButton>
          </div>
        </div>

        <DashboardTableCard
          :title="$t('admin.users.listTitle')"
          icon="i-mdi-account-group-outline"
        >
          <DashboardDataTable
            v-model:page="page"
            v-model:page-size="pageSize"
            v-model:column-visibility="columnVisibility"
            :data="items"
            :columns="columns"
            :loading="loading"
            :total="total"
            :page-size-options="PAGE_SIZE_OPTIONS"
            :get-row-id="(row: AdminUserItem) => String(row.id)"
            :empty-title="$t('admin.users.empty')"
            empty-icon="i-mdi-account-off-outline"
          >
            <template #credits-cell="{ row }">
              <UBadge
                :color="Number(row.original.credits ?? 0) > 0 ? 'success' : 'neutral'"
                variant="subtle"
                class="tabular-nums font-mono"
              >
                {{ Number(row.original.credits ?? 0).toLocaleString(locale) }}
              </UBadge>
            </template>
            <template #role-cell="{ row }">
              <UBadge
                :color="row.original.role === 'admin' ? 'primary' : 'neutral'"
                variant="subtle"
                :icon="row.original.role === 'admin' ? 'i-mdi-shield-crown-outline' : 'i-mdi-account-outline'"
              >
                {{ row.original.role === 'admin' ? $t('common.identities.admin') : $t('common.identities.user') }}
              </UBadge>
            </template>
            <template #isActive-cell="{ row }">
              <UBadge
                :color="row.original.isActive ? 'success' : 'neutral'"
                variant="subtle"
              >
                {{ row.original.isActive ? $t('common.accounts.active') : $t('common.accounts.inactive') }}
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
                  {{ row.original.bannedUntil
                    ? $t('common.accounts.bannedUntil', {
                      time: formatDateTime(row.original.bannedUntil, '-', locale)
                    })
                    : $t('common.accounts.permanentBan') }}
                </UBadge>
              </UTooltip>
              <UBadge
                v-else
                color="success"
                variant="subtle"
              >
                {{ $t('common.accounts.unbanned') }}
              </UBadge>
            </template>
            <template #createdAt-cell="{ row }">
              {{ formatDateTime(row.original.createdAt, '-', locale) }}
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

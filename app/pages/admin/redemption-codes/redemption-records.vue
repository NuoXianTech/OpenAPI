<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { useAdminPagedList } from '~/composables/dashboard/useAdminPagedList'

useHead({ title: '兑换记录' })
definePageMeta({ layout: 'admin', middleware: 'auth-admin' })

interface RedemptionRecordRow {
  id: number
  codeId: number
  code: string | null
  batchId: string | null
  userId: number
  username: string | null
  amount: number
  ip: string | null
  redeemedAt: string
}

type RedemptionFilters = {
  startAt: string
  endAt: string
  codeId: number | ''
  batchId: string
  userId: number | ''
  username: string
}

const pageSize = 50
const {
  filters,
  page,
  items,
  total,
  status,
  applyFilters,
  reset
} = useAdminPagedList<RedemptionFilters, RedemptionRecordRow>({
  path: '/api/admin/redemption-codes/redemptions',
  defaultFilters: {
    startAt: '',
    endAt: '',
    codeId: '',
    batchId: '',
    userId: '',
    username: ''
  },
  defaultPageSize: pageSize,
  buildQuery: (f, p) => ({
    startAt: f.startAt ? new Date(f.startAt).toISOString() : undefined,
    endAt: f.endAt ? new Date(f.endAt).toISOString() : undefined,
    codeId: f.codeId || undefined,
    batchId: f.batchId.trim() || undefined,
    userId: f.userId || undefined,
    username: f.username.trim() || undefined,
    limit: p.limit,
    offset: p.offset
  })
})

const loading = computed(() => status.value === 'pending')

const expandedFilters = ref(false)
const hasAdvancedFilters = computed(
  () => filters.codeId !== '' || !!filters.batchId || filters.userId !== ''
)

function formatDate(val: string) {
  if (!val) return '-'
  return new Date(val).toLocaleString('zh-CN', { hour12: false })
}

const columns: TableColumn<RedemptionRecordRow>[] = [
  { accessorKey: 'redeemedAt', header: '兑换时间' },
  { accessorKey: 'code', header: '兑换码' },
  { accessorKey: 'username', header: '用户' },
  { accessorKey: 'amount', header: '到账积分' },
  { accessorKey: 'ip', header: 'IP' }
]
</script>

<template>
  <div class="space-y-4">
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon
            name="i-mdi-clipboard-check-outline"
            class="size-5 text-muted"
          />
          <h3 class="font-semibold">
            兑换记录
          </h3>
          <span class="ml-auto text-xs text-muted tabular-nums">
            共 {{ total.toLocaleString() }} 条
          </span>
        </div>
      </template>

      <div class="space-y-3">
        <div class="flex flex-wrap items-end gap-3">
          <UFormField
            label="开始时间"
            class="min-w-[200px]"
          >
            <UInput
              v-model="filters.startAt"
              type="datetime-local"
            />
          </UFormField>
          <UFormField
            label="结束时间"
            class="min-w-[200px]"
          >
            <UInput
              v-model="filters.endAt"
              type="datetime-local"
            />
          </UFormField>
          <UFormField
            label="用户名"
            hint="模糊匹配"
            class="min-w-[200px]"
          >
            <UInput
              v-model="filters.username"
              placeholder="留空查全部"
            />
          </UFormField>

          <UButton
            :color="expandedFilters ? 'primary' : 'neutral'"
            variant="outline"
            :icon="expandedFilters ? 'i-mdi-chevron-up' : 'i-mdi-chevron-down'"
            @click="expandedFilters = !expandedFilters"
          >
            展开
            <UBadge
              v-if="hasAdvancedFilters"
              color="primary"
              variant="solid"
              size="sm"
              class="ml-1"
            >
              ·
            </UBadge>
          </UButton>
        </div>

        <Transition
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="opacity-0 -translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <div
            v-if="expandedFilters"
            class="flex flex-wrap items-end gap-3 border-t border-default pt-3"
          >
            <UFormField
              label="兑换码 ID"
              class="min-w-[140px]"
            >
              <UInput
                v-model.number="filters.codeId"
                type="number"
                placeholder="留空"
              />
            </UFormField>
            <UFormField
              label="批次 ID"
              class="min-w-[220px]"
            >
              <UInput
                v-model="filters.batchId"
                placeholder="留空"
              />
            </UFormField>
            <UFormField
              label="用户 ID"
              class="min-w-[140px]"
            >
              <UInput
                v-model.number="filters.userId"
                type="number"
                placeholder="留空"
              />
            </UFormField>
          </div>
        </Transition>

        <div class="flex justify-end gap-2 pt-1">
          <UButton
            color="neutral"
            variant="outline"
            @click="reset"
          >
            重置
          </UButton>
          <UButton
            icon="i-mdi-magnify"
            @click="applyFilters"
          >
            查询
          </UButton>
        </div>
      </div>

      <div class="mt-4">
        <DashboardDataTable
          v-model:page="page"
          :data="items"
          :columns="columns"
          :loading="loading"
          :page-size="pageSize"
          :total="total"
          empty-title="暂无兑换记录"
          empty-icon="i-mdi-clipboard-check-outline"
        >
          <template #redeemedAt-cell="{ row }">
            <span class="text-xs text-muted whitespace-nowrap">
              {{ formatDate(row.original.redeemedAt) }}
            </span>
          </template>
          <template #code-cell="{ row }">
            <div class="flex flex-col gap-0.5">
              <span class="font-mono text-xs">
                {{ row.original.code || `#${row.original.codeId}` }}
              </span>
              <span
                v-if="row.original.batchId"
                class="font-mono text-[11px] text-muted"
              >
                {{ row.original.batchId }}
              </span>
            </div>
          </template>
          <template #username-cell="{ row }">
            <div class="flex flex-col text-xs">
              <span>{{ row.original.username || '-' }}</span>
              <span class="font-mono text-muted">#{{ row.original.userId }}</span>
            </div>
          </template>
          <template #amount-cell="{ row }">
            <span class="tabular-nums font-semibold text-success">
              +{{ row.original.amount.toLocaleString() }}
            </span>
          </template>
          <template #ip-cell="{ row }">
            <span class="font-mono text-xs text-muted">{{ row.original.ip || '-' }}</span>
          </template>
        </DashboardDataTable>
      </div>
    </UCard>
  </div>
</template>

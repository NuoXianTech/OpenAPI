<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import {
  LOGIN_METHOD_META,
  loginFailureReasonLabel,
  loginMethodLabel,
  type LoginLogRow,
  type LoginMethod
} from '~~/shared/types/login-log'

defineProps<{
  items: LoginLogRow[]
  loading: boolean
}>()

const emit = defineEmits<{ refresh: [] }>()

function methodColor(method: string) {
  return LOGIN_METHOD_META[method as LoginMethod]?.color || 'neutral'
}
function methodIcon(method: string) {
  return LOGIN_METHOD_META[method as LoginMethod]?.icon
}

const columns: TableColumn<LoginLogRow>[] = [
  { accessorKey: 'createdAt', header: '时间' },
  { accessorKey: 'method', header: '方式' },
  { accessorKey: 'success', header: '结果' },
  { accessorKey: 'device', header: '设备' },
  { accessorKey: 'ip', header: 'IP' }
]
</script>

<template>
  <DashboardSettingsSection
    title="最近登录活动"
    description="展示最近的登录记录，若发现非本人登录请尽快修改密码。"
  >
    <template #actions>
      <UButton
        size="xs"
        variant="ghost"
        color="neutral"
        icon="i-mdi-refresh"
        :loading="loading"
        @click="emit('refresh')"
      />
    </template>

    <DashboardTableCard
      title="登录记录"
      icon="i-mdi-login-variant"
      :total="items.length"
      embedded
    >
      <DashboardDataTable
        :data="items"
        :columns="columns"
        :loading="loading"
        :fixed="false"
        empty-title="暂无登录记录"
        empty-icon="i-mdi-login-variant"
      >
        <template #createdAt-cell="{ row }">
          <span class="text-xs text-muted whitespace-nowrap">{{ formatDateTime(row.original.createdAt) }}</span>
        </template>
        <template #method-cell="{ row }">
          <UBadge
            :color="methodColor(row.original.method)"
            :icon="methodIcon(row.original.method)"
            variant="subtle"
            size="sm"
          >
            {{ loginMethodLabel(row.original.method) }}
          </UBadge>
        </template>
        <template #success-cell="{ row }">
          <UBadge
            :color="row.original.success ? 'success' : 'error'"
            variant="subtle"
            size="sm"
          >
            {{ row.original.success ? '成功' : loginFailureReasonLabel(row.original.failureReason) }}
          </UBadge>
        </template>
        <template #device-cell="{ row }">
          <span
            class="text-xs"
            :title="row.original.userAgent || ''"
          >{{ row.original.device }}</span>
        </template>
        <template #ip-cell="{ row }">
          <span class="font-mono text-xs text-muted">{{ row.original.ip || '-' }}</span>
        </template>
      </DashboardDataTable>
    </DashboardTableCard>
    <p
      v-if="items.length > 0"
      class="mt-3 text-xs text-muted"
    >
      仅展示最近 {{ items.length }} 条。若发现非本人登录，请尽快修改密码。
    </p>
  </DashboardSettingsSection>
</template>

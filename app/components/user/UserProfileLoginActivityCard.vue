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

function formatDate(iso: string) {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleString('zh-CN', { hour12: false })
  } catch {
    return iso
  }
}
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
  <UCard>
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon
          name="i-mdi-login-variant"
          class="size-5 text-muted"
        />
        <h3 class="font-semibold">
          最近登录活动
        </h3>
        <UButton
          class="ml-auto"
          size="xs"
          variant="ghost"
          color="neutral"
          icon="i-mdi-refresh"
          :loading="loading"
          @click="emit('refresh')"
        />
      </div>
    </template>

    <div
      v-if="loading && items.length === 0"
      class="text-sm text-muted py-4 text-center"
    >
      加载中...
    </div>
    <div
      v-else-if="items.length === 0"
      class="text-sm text-muted py-4 text-center"
    >
      暂无登录记录
    </div>
    <template v-else>
      <UTable
        :data="items"
        :columns="columns"
        :loading="loading"
      >
        <template #createdAt-cell="{ row }">
          <span class="text-xs text-muted whitespace-nowrap">{{ formatDate(row.original.createdAt) }}</span>
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
      </UTable>
      <p class="mt-3 text-xs text-muted">
        仅展示最近 {{ items.length }} 条。若发现非本人登录，请尽快修改密码。
      </p>
    </template>
  </UCard>
</template>

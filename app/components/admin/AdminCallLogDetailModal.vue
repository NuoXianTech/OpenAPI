<script setup lang="ts">
import type { AdminLogRow } from '#shared/types/admin-logs'
import { ADMIN_CALL_LOG_TYPE_META } from '~/composables/admin/use-admin-call-logs-page'

const props = defineProps<{
  row: AdminLogRow | null
}>()

function formatBytes(value: number | null) {
  if (value == null) return '-'
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(2)} MB`
}
</script>

<template>
  <UModal
    title="调用详情"
    :ui="{ content: 'max-w-2xl' }"
  >
    <template #body>
      <div
        v-if="props.row"
        class="space-y-4 text-sm"
      >
        <div class="grid grid-cols-2 gap-3">
          <div>
            <div class="text-xs text-muted">
              时间
            </div>
            <div>{{ formatDateTime(props.row.createdAt) }}</div>
          </div>
          <div>
            <div class="text-xs text-muted">
              类型
            </div>
            <UBadge
              :color="ADMIN_CALL_LOG_TYPE_META[props.row.type].color"
              :icon="ADMIN_CALL_LOG_TYPE_META[props.row.type].icon"
              variant="subtle"
              size="sm"
              class="w-fit"
            >
              {{ ADMIN_CALL_LOG_TYPE_META[props.row.type].label }}
            </UBadge>
          </div>
          <div>
            <div class="text-xs text-muted">
              请求 ID
            </div>
            <div class="font-mono text-xs break-all">
              {{ props.row.requestId || '-' }}
            </div>
          </div>
          <div>
            <div class="text-xs text-muted">
              用户
            </div>
            <div>{{ props.row.userId ? `${props.row.userName || '-'} (#${props.row.userId})` : '匿名' }}</div>
          </div>
          <div>
            <div class="text-xs text-muted">
              密钥
            </div>
            <div>
              {{ props.row.apiKeyName || (props.row.apiKeyId ? `#${props.row.apiKeyId}` : '-') }}
            </div>
          </div>
          <div>
            <div class="text-xs text-muted">
              接口
            </div>
            <div>
              {{ props.row.apiName || '-' }}
              <span
                v-if="props.row.categoryName"
                class="text-muted text-xs"
              >· {{ props.row.categoryName }}</span>
            </div>
          </div>
        </div>

        <UCard :ui="{ root: 'rounded-md', header: 'px-3 py-2', body: 'px-3 py-2' }">
          <template #header>
            <span class="text-xs font-semibold text-muted">请求</span>
          </template>
          <div class="space-y-2 text-xs">
            <div class="flex items-center gap-2">
              <UBadge
                color="neutral"
                variant="subtle"
                class="font-mono"
              >
                {{ props.row.method }}
              </UBadge>
              <span class="font-mono break-all">{{ props.row.apiPath }}</span>
            </div>
            <div
              v-if="props.row.queryString"
              class="font-mono text-muted break-all"
            >
              ?{{ props.row.queryString }}
            </div>
            <div class="flex flex-wrap gap-x-4 gap-y-1 text-muted">
              <span>状态码 <span
                class="tabular-nums"
                :class="props.row.statusCode >= 400 ? 'text-error' : 'text-default'"
              >{{ props.row.statusCode }}</span></span>
              <span>耗时 <span class="tabular-nums text-default">{{ props.row.latencyMs }}ms</span></span>
              <span>费用 <span class="tabular-nums text-default">{{ props.row.cost > 0 ? `-${props.row.cost}` : '免费' }}</span></span>
              <span>请求体 <span class="text-default">{{ formatBytes(props.row.requestSize) }}</span></span>
              <span>响应体 <span class="text-default">{{ formatBytes(props.row.responseSize) }}</span></span>
            </div>
          </div>
        </UCard>

        <UCard
          v-if="props.row.errorCode || props.row.errorMessage"
          :ui="{ root: 'rounded-md', header: 'px-3 py-2', body: 'px-3 py-2' }"
        >
          <template #header>
            <span class="text-xs font-semibold text-error">错误</span>
          </template>
          <div class="space-y-1 text-xs">
            <div v-if="props.row.errorCode">
              <span class="text-muted">code </span>
              <span class="font-mono">{{ props.row.errorCode }}</span>
            </div>
            <div
              v-if="props.row.errorMessage"
              class="break-all"
            >
              {{ props.row.errorMessage }}
            </div>
          </div>
        </UCard>

        <UCard :ui="{ root: 'rounded-md', header: 'px-3 py-2', body: 'px-3 py-2' }">
          <template #header>
            <span class="text-xs font-semibold text-muted">客户端</span>
          </template>
          <div class="space-y-1 text-xs">
            <div>
              <span class="text-muted">IP </span>
              <span class="font-mono">{{ props.row.ip || '-' }}</span>
            </div>
            <div>
              <span class="text-muted">User-Agent </span>
              <span class="font-mono break-all">{{ props.row.userAgent || '-' }}</span>
            </div>
            <div v-if="props.row.referer">
              <span class="text-muted">Referer </span>
              <span class="font-mono break-all">{{ props.row.referer }}</span>
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </UModal>
</template>

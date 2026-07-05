<script setup lang="ts">
import {
  userCallOutcomeColor,
  userCallOutcomeIcon,
  userCallOutcomeLabel,
  type UserCallLogRow
} from '~/composables/user/use-user-call-logs-page'

const props = defineProps<{
  row: UserCallLogRow | null
}>()
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
              结果
            </div>
            <UBadge
              :color="userCallOutcomeColor(props.row)"
              :icon="userCallOutcomeIcon(props.row)"
              variant="subtle"
              size="sm"
              class="w-fit"
            >
              {{ userCallOutcomeLabel(props.row) }}
            </UBadge>
          </div>
          <div>
            <div class="text-xs text-muted">
              接口
            </div>
            <div>{{ props.row.apiName || '-' }}</div>
          </div>
          <div>
            <div class="text-xs text-muted">
              密钥
            </div>
            <div>
              {{ props.row.apiKeyName || (props.row.apiKeyId ? `#${props.row.apiKeyId}` : '未携带') }}
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
            <div class="flex flex-wrap gap-x-4 gap-y-1 text-muted">
              <span>状态码 <span
                class="tabular-nums"
                :class="props.row.statusCode >= 400 ? 'text-error' : 'text-default'"
              >{{ props.row.statusCode }}</span></span>
              <span>耗时 <span class="tabular-nums text-default">{{ props.row.latencyMs }}ms</span></span>
              <span>费用 <span class="tabular-nums text-default">{{ props.row.creditsCost > 0 ? `-${props.row.creditsCost}` : '免费' }}</span></span>
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
          </div>
        </UCard>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { AdminLogRow } from '#shared/types/admin'
import { adminModalUi } from '~/utils/admin-modal-ui'
import { ADMIN_CALL_LOG_TYPE_META } from '~/composables/admin/use-admin-call-logs-page'

const props = defineProps<{
  row: AdminLogRow | null
}>()
const { locale } = useI18n()

function formatBytes(value: number | null) {
  if (value == null) return '-'
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(2)} MB`
}
</script>

<template>
  <UModal
    :title="$t('admin.logs.call.detail.title')"
    :ui="adminModalUi({ content: 'max-w-2xl' })"
  >
    <template #body>
      <div
        v-if="props.row"
        class="space-y-4 text-sm"
      >
        <div class="grid grid-cols-2 gap-3">
          <div>
            <div class="text-xs text-muted">
              {{ $t('admin.logs.call.detail.time') }}
            </div>
            <div>{{ formatDateTime(props.row.createdAt, '-', locale) }}</div>
          </div>
          <div>
            <div class="text-xs text-muted">
              {{ $t('admin.logs.call.detail.type') }}
            </div>
            <UBadge
              :color="ADMIN_CALL_LOG_TYPE_META[props.row.type].color"
              :icon="ADMIN_CALL_LOG_TYPE_META[props.row.type].icon"
              variant="subtle"
              size="sm"
              class="w-fit"
            >
              {{ $t(ADMIN_CALL_LOG_TYPE_META[props.row.type].messageKey) }}
            </UBadge>
          </div>
          <div>
            <div class="text-xs text-muted">
              {{ $t('admin.logs.call.detail.requestId') }}
            </div>
            <div class="font-mono text-xs break-all">
              {{ props.row.requestId || '-' }}
            </div>
          </div>
          <div>
            <div class="text-xs text-muted">
              {{ $t('admin.logs.call.detail.user') }}
            </div>
            <div
              v-if="props.row.userId"
              class="flex flex-col"
            >
              <span>{{ props.row.userName || '-' }}</span>
              <span class="text-xs text-muted">{{ $t('common.identities.userWithId', { id: props.row.userId }) }}</span>
            </div>
            <div v-else>
              {{ $t('common.identities.anonymous') }}
            </div>
          </div>
          <div>
            <div class="text-xs text-muted">
              {{ $t('admin.logs.call.detail.key') }}
            </div>
            <div>
              {{ props.row.apiKeyName || (props.row.apiKeyId ? `#${props.row.apiKeyId}` : '-') }}
            </div>
          </div>
          <div>
            <div class="text-xs text-muted">
              {{ $t('admin.logs.call.detail.api') }}
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
            <span class="text-xs font-semibold text-muted">{{ $t('admin.logs.call.detail.request') }}</span>
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
              <span>{{ $t('admin.logs.call.detail.statusCode') }} <span
                class="tabular-nums"
                :class="props.row.statusCode >= 400 ? 'text-error' : 'text-default'"
              >{{ props.row.statusCode }}</span></span>
              <span>{{ $t('admin.logs.call.detail.latency') }} <span class="tabular-nums text-default">{{ $t('admin.logs.call.milliseconds', { value: props.row.latencyMs }) }}</span></span>
              <span>{{ $t('admin.logs.call.detail.cost') }} <span class="tabular-nums text-default">{{ props.row.cost > 0 ? `-${props.row.cost}` : $t('admin.logs.call.free') }}</span></span>
              <span>{{ $t('admin.logs.call.detail.requestBody') }} <span class="text-default">{{ formatBytes(props.row.requestSize) }}</span></span>
              <span>{{ $t('admin.logs.call.detail.responseBody') }} <span class="text-default">{{ formatBytes(props.row.responseSize) }}</span></span>
            </div>
          </div>
        </UCard>

        <UCard
          v-if="props.row.errorCode || props.row.errorMessage"
          :ui="{ root: 'rounded-md', header: 'px-3 py-2', body: 'px-3 py-2' }"
        >
          <template #header>
            <span class="text-xs font-semibold text-error">{{ $t('admin.logs.call.detail.error') }}</span>
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
            <span class="text-xs font-semibold text-muted">{{ $t('admin.logs.call.detail.client') }}</span>
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

<script setup lang="ts">
import ApiHttpMethodBadge from '~/components/api/HttpMethodBadge.vue'
import {
  userCallOutcomeColor,
  userCallOutcomeIcon,
  useUserCallOutcomeMeta,
  type UserCallLogRow
} from '~/composables/user/use-user-call-logs-page'

const props = defineProps<{
  row: UserCallLogRow | null
}>()
const { locale } = useI18n()
const { getOutcomeLabel } = useUserCallOutcomeMeta()
</script>

<template>
  <UModal
    :title="$t('user.logs.detail.title')"
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
              {{ $t('user.logs.columns.time') }}
            </div>
            <div>{{ formatDateTime(props.row.createdAt, '-', locale) }}</div>
          </div>
          <div>
            <div class="text-xs text-muted">
              {{ $t('user.logs.detail.result') }}
            </div>
            <UBadge
              :color="userCallOutcomeColor(props.row)"
              :icon="userCallOutcomeIcon(props.row)"
              variant="subtle"
              size="sm"
              class="w-fit"
            >
              {{ getOutcomeLabel(props.row) }}
            </UBadge>
          </div>
          <div>
            <div class="text-xs text-muted">
              {{ $t('user.logs.columns.api') }}
            </div>
            <div>{{ props.row.apiName || '-' }}</div>
          </div>
          <div>
            <div class="text-xs text-muted">
              {{ $t('user.logs.columns.key') }}
            </div>
            <div>
              {{ props.row.apiKeyName || (props.row.apiKeyId ? `#${props.row.apiKeyId}` : $t('user.logs.noApiKey')) }}
            </div>
          </div>
        </div>

        <UCard :ui="{ root: 'rounded-md', header: 'px-3 py-2', body: 'px-3 py-2' }">
          <template #header>
            <span class="text-xs font-semibold text-muted">{{ $t('user.logs.detail.request') }}</span>
          </template>
          <div class="space-y-2 text-xs">
            <div class="flex items-center gap-2">
              <ApiHttpMethodBadge :method="props.row.method" />
              <span class="font-mono break-all">{{ props.row.apiPath }}</span>
            </div>
            <div class="flex flex-wrap gap-x-4 gap-y-1 text-muted">
              <span>{{ $t('user.logs.detail.statusCode') }} <span
                class="tabular-nums"
                :class="props.row.statusCode >= 400 ? 'text-error' : 'text-default'"
              >{{ props.row.statusCode }}</span></span>
              <span>{{ $t('user.logs.detail.latency') }} <span class="tabular-nums text-default">{{ $t('user.logs.milliseconds', { value: props.row.latencyMs.toLocaleString(locale) }) }}</span></span>
              <span>{{ $t('user.logs.columns.cost') }} <span class="tabular-nums text-default">{{ props.row.creditsCost > 0 ? `-${props.row.creditsCost.toLocaleString(locale)}` : $t('user.logs.free') }}</span></span>
            </div>
          </div>
        </UCard>

        <UCard
          v-if="props.row.errorCode || props.row.errorMessage"
          :ui="{ root: 'rounded-md', header: 'px-3 py-2', body: 'px-3 py-2' }"
        >
          <template #header>
            <span class="text-xs font-semibold text-error">{{ $t('user.logs.detail.error') }}</span>
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
            <span class="text-xs font-semibold text-muted">{{ $t('user.logs.detail.client') }}</span>
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

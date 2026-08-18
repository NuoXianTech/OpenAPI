<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { LoginLogRow } from '#shared/types/login-log'
import { useLoginLogMeta } from '~/composables/use-login-log-meta'

defineProps<{
  items: LoginLogRow[]
  loading: boolean
}>()

const emit = defineEmits<{ refresh: [] }>()
const { t, locale } = useI18n()
const {
  getLoginFailureLabel,
  getLoginMethodColor,
  getLoginMethodIcon,
  getLoginMethodLabel
} = useLoginLogMeta()

const columns = computed<TableColumn<LoginLogRow>[]>(() => [
  { accessorKey: 'createdAt', header: t('user.settings.loginActivity.columns.time') },
  { accessorKey: 'method', header: t('user.settings.loginActivity.columns.method') },
  { accessorKey: 'success', header: t('user.settings.loginActivity.columns.result') },
  { accessorKey: 'device', header: t('user.settings.loginActivity.columns.device') },
  { accessorKey: 'ip', header: 'IP' }
])
</script>

<template>
  <DashboardTableCard
    :title="$t('user.settings.loginActivity.title')"
    :description="$t('user.settings.loginActivity.hint')"
    icon="i-mdi-login-variant"
  >
    <template #actions>
      <UButton
        size="sm"
        variant="outline"
        color="neutral"
        icon="i-lucide-refresh-cw"
        :loading="loading"
        @click="emit('refresh')"
      >
        {{ $t('common.actions.refresh') }}
      </UButton>
    </template>

    <DashboardDataTable
      :data="items"
      :columns="columns"
      :loading="loading"
      :fixed="false"
      :empty-title="$t('user.settings.loginActivity.empty')"
      empty-icon="i-mdi-login-variant"
    >
      <template #createdAt-cell="{ row }">
        <span class="text-xs text-muted whitespace-nowrap">{{ formatDateTime(row.original.createdAt, '-', locale) }}</span>
      </template>
      <template #method-cell="{ row }">
        <UBadge
          :color="getLoginMethodColor(row.original.method)"
          :icon="getLoginMethodIcon(row.original.method)"
          variant="subtle"
          size="sm"
        >
          {{ getLoginMethodLabel(row.original.method) }}
        </UBadge>
      </template>
      <template #success-cell="{ row }">
        <UBadge
          :color="row.original.success ? 'success' : 'error'"
          variant="subtle"
          size="sm"
        >
          {{ row.original.success ? $t('common.states.success') : getLoginFailureLabel(row.original.failureReason) }}
        </UBadge>
      </template>
      <template #device-cell="{ row }">
        <UTooltip
          :text="row.original.userAgent || ''"
          :content="{ side: 'top' }"
          :disabled="!row.original.userAgent"
        >
          <span class="text-xs">{{ row.original.device }}</span>
        </UTooltip>
      </template>
      <template #ip-cell="{ row }">
        <span class="font-mono text-xs text-muted">{{ row.original.ip || '-' }}</span>
      </template>
    </DashboardDataTable>
  </DashboardTableCard>
</template>

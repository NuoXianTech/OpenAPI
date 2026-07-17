<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { LoginLogRow } from '#shared/types/login-log'
import { useLoginLogMeta } from '~/composables/logs/use-login-log-meta'

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
  <DashboardSettingsSection
    :title="$t('user.settings.loginActivity.title')"
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
      :title="$t('user.settings.loginActivity.records')"
      icon="i-mdi-login-variant"
      :total="items.length"
      embedded
    >
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
      {{ $t('user.settings.loginActivity.hint', { count: items.length.toLocaleString(locale) }) }}
    </p>
  </DashboardSettingsSection>
</template>

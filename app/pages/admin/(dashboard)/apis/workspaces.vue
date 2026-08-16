<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { useAdminPlatformContext } from '~/composables/admin/use-admin-platform-context'
import type { PlatformWorkspace } from '~/types/platform'
import { formatPlatformDate, platformStatusColor } from '~/utils/platform-display'

const { t, locale } = useI18n()
const context = useAdminPlatformContext()
const modalOpen = ref(false)

useHead({ title: () => t('admin.apis.routing.sections.workspacesTitle') })

async function handleSaved(workspace: PlatformWorkspace) {
  await context.refresh()
  context.selectedWorkspaceId.value = workspace.id
}

const columns = computed<TableColumn<PlatformWorkspace>[]>(() => [
  { id: 'workspace', header: t('admin.apis.routing.columns.workspace') },
  { id: 'environments', header: t('admin.apis.routing.columns.environments') },
  { id: 'status', header: t('admin.apis.routing.columns.state') },
  { id: 'createdAt', header: t('admin.apis.routing.columns.createdAt') }
])
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div class="max-w-3xl">
        <h1 class="text-2xl font-semibold tracking-tight text-highlighted">
          {{ $t('admin.apis.routing.sections.workspacesTitle') }}
        </h1>
        <p class="mt-2 text-sm leading-6 text-muted">
          {{ $t('admin.apis.routing.sections.workspacesDescription') }}
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-refresh-cw"
          :loading="context.loading.value"
          @click="context.refresh"
        >
          {{ $t('common.actions.refresh') }}
        </UButton>
        <UButton icon="i-lucide-plus" @click="modalOpen = true">
          {{ $t('admin.apis.routing.actions.createWorkspace') }}
        </UButton>
      </div>
    </div>

    <UAlert
      color="neutral"
      variant="subtle"
      icon="i-lucide-info"
      :title="$t('admin.apis.routing.workspaceForm.boundaryTitle')"
      :description="$t('admin.apis.routing.workspaceForm.boundaryDescription')"
    />

    <UAlert
      v-if="context.error.value"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :title="$t('common.feedback.loadFailed')"
    >
      <template #actions>
        <UButton
          color="error"
          variant="soft"
          size="xs"
          @click="context.refresh"
        >
          {{ $t('common.actions.retry') }}
        </UButton>
      </template>
    </UAlert>

    <DashboardTableCard
      :title="$t('admin.apis.routing.sections.workspacesTitle')"
      :description="$t('admin.apis.routing.sections.workspacesDescription')"
      :total="context.workspaces.value.length"
      icon="i-lucide-panels-top-left"
    >
      <DashboardDataTable
        :data="context.workspaces.value"
        :columns="columns"
        :loading="context.loading.value"
        :fixed="false"
        :empty-title="$t('admin.apis.routing.empty.workspacesTitle')"
        :empty-description="$t('admin.apis.routing.empty.workspacesDescription')"
        empty-icon="i-lucide-panels-top-left"
      >
        <template #workspace-cell="{ row }">
          <div class="min-w-48">
            <p class="text-sm font-semibold text-highlighted">
              {{ row.original.name }}
            </p>
            <p class="font-mono text-xs text-muted">
              {{ row.original.slug }}
            </p>
          </div>
        </template>
        <template #environments-cell="{ row }">
          <div class="flex flex-wrap gap-1.5">
            <UBadge
              v-for="environment in row.original.environments"
              :key="environment.id"
              :color="environment.activeRevisionId ? 'success' : 'neutral'"
              variant="subtle"
              size="sm"
            >
              {{ environment.name }}
            </UBadge>
          </div>
        </template>
        <template #status-cell="{ row }">
          <UBadge :color="platformStatusColor(row.original.status)" variant="subtle">
            {{ $t(`admin.apis.routing.serviceStatuses.${row.original.status}`) }}
          </UBadge>
        </template>
        <template #createdAt-cell="{ row }">
          <span class="text-xs text-muted">
            {{ formatPlatformDate(row.original.createdAt, locale) }}
          </span>
        </template>
        <template #empty-actions>
          <UButton size="sm" icon="i-lucide-plus" @click="modalOpen = true">
            {{ $t('admin.apis.routing.actions.createWorkspace') }}
          </UButton>
        </template>
      </DashboardDataTable>
    </DashboardTableCard>

    <AdminPlatformWorkspaceModal
      v-model:open="modalOpen"
      @saved="handleSaved"
    />
  </div>
</template>

<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import { useAdminPlatformContext } from '~/composables/admin/use-admin-platform-context'
import type { PlatformEnvironment, PlatformWorkspace, PlatformWorkspacePublicationResult } from '~/types/platform'
import { parseFetchError } from '~/utils/client-error'
import { formatPlatformDate, platformPublicationFeedback, platformStatusColor } from '~/utils/platform-display'

const { t, locale } = useI18n()
const context = useAdminPlatformContext()
const modalOpen = ref(false)
const editingWorkspace = ref<PlatformWorkspace | null>(null)
const environmentModalOpen = ref(false)
const environmentWorkspace = ref<PlatformWorkspace | null>(null)
const editingEnvironment = ref<PlatformEnvironment | null>(null)
const toast = useToast()
const confirm = useConfirmDialog()

useHead({ title: () => t('admin.apis.routing.sections.workspacesTitle') })

async function handleSaved(workspace: PlatformWorkspace) {
  await context.refresh()
  context.selectedWorkspaceId.value = workspace.id
}

const columns = computed<TableColumn<PlatformWorkspace>[]>(() => [
  { id: 'workspace', header: t('admin.apis.routing.columns.workspace') },
  { id: 'environments', header: t('admin.apis.routing.columns.environments') },
  { id: 'status', header: t('admin.apis.routing.columns.state') },
  { id: 'createdAt', header: t('admin.apis.routing.columns.createdAt') },
  { id: 'actions', header: '' }
])

function openCreateWorkspace() {
  editingWorkspace.value = null
  modalOpen.value = true
}

function openEditWorkspace(workspace: PlatformWorkspace) {
  editingWorkspace.value = workspace
  modalOpen.value = true
}

function openEnvironment(workspace: PlatformWorkspace, environment: PlatformEnvironment | null = null) {
  environmentWorkspace.value = workspace
  editingEnvironment.value = environment
  environmentModalOpen.value = true
}

async function updateWorkspaceStatus(workspace: PlatformWorkspace) {
  try {
    await $fetch(`/api/admin/v1/workspaces/${workspace.id}`, {
      method: 'PATCH',
      body: { status: workspace.status === 'active' ? 'disabled' : 'active' }
    })
    await context.refresh()
  } catch (error) {
    toast.add({ title: parseFetchError(error, t('common.feedback.operationFailed')), color: 'error' })
  }
}

async function removeWorkspace(workspace: PlatformWorkspace) {
  await confirm({
    title: t('admin.apis.routing.deleteWorkspace.title', { name: workspace.name }),
    description: t('admin.apis.routing.deleteWorkspace.description'),
    onConfirm: async () => {
      try {
        await $fetch(`/api/admin/v1/workspaces/${workspace.id}`, { method: 'DELETE' })
        await context.refresh()
      } catch (error) {
        toast.add({ title: parseFetchError(error, t('common.feedback.operationFailed')), color: 'error' })
      }
    }
  })
}

async function updateEnvironmentStatus(environment: PlatformEnvironment) {
  try {
    const result = await $fetch<PlatformWorkspacePublicationResult>(`/api/admin/v1/environments/${environment.id}`, {
      method: 'PATCH',
      body: { status: environment.status === 'active' ? 'disabled' : 'active' }
    })
    toast.add(platformPublicationFeedback(
      result,
      t('common.feedback.updated'),
      t('admin.apis.routing.feedback.savedPendingPublish')
    ))
    await context.refresh()
  } catch (error) {
    toast.add({ title: parseFetchError(error, t('common.feedback.operationFailed')), color: 'error' })
  }
}

async function removeEnvironment(environment: PlatformEnvironment) {
  await confirm({
    title: t('admin.apis.routing.deleteEnvironment.title', { name: environment.name }),
    description: t('admin.apis.routing.deleteEnvironment.description'),
    onConfirm: async () => {
      try {
        const result = await $fetch<PlatformWorkspacePublicationResult>(
          `/api/admin/v1/environments/${environment.id}`,
          { method: 'DELETE' }
        )
        toast.add(platformPublicationFeedback(
          result,
          t('common.feedback.deleted'),
          t('admin.apis.routing.feedback.savedPendingPublish')
        ))
        await context.refresh()
      } catch (error) {
        toast.add({ title: parseFetchError(error, t('common.feedback.operationFailed')), color: 'error' })
      }
    }
  })
}

function workspaceItems(workspace: PlatformWorkspace): DropdownMenuItem[][] {
  return [[
    { label: t('common.actions.edit'), icon: 'i-lucide-pencil', onSelect: () => openEditWorkspace(workspace) },
    { label: t('admin.apis.routing.actions.createEnvironment'), icon: 'i-lucide-plus', onSelect: () => openEnvironment(workspace) },
    {
      label: t(workspace.status === 'active' ? 'common.actions.disable' : 'common.actions.enable'),
      icon: workspace.status === 'active' ? 'i-lucide-pause' : 'i-lucide-play',
      onSelect: () => updateWorkspaceStatus(workspace)
    }
  ], [
    { label: t('common.actions.delete'), icon: 'i-lucide-trash-2', color: 'error', onSelect: () => removeWorkspace(workspace) }
  ]]
}

function environmentItems(workspace: PlatformWorkspace, environment: PlatformEnvironment): DropdownMenuItem[][] {
  return [[
    { label: t('common.actions.edit'), icon: 'i-lucide-pencil', onSelect: () => openEnvironment(workspace, environment) },
    {
      label: t(environment.status === 'active' ? 'common.actions.disable' : 'common.actions.enable'),
      icon: environment.status === 'active' ? 'i-lucide-pause' : 'i-lucide-play',
      onSelect: () => updateEnvironmentStatus(environment)
    },
    { label: t('common.actions.delete'), icon: 'i-lucide-trash-2', color: 'error', onSelect: () => removeEnvironment(environment) }
  ]]
}
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
        <UButton icon="i-lucide-plus" @click="openCreateWorkspace">
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
            <UDropdownMenu
              v-for="environment in row.original.environments"
              :key="environment.id"
              :items="environmentItems(row.original, environment)"
            >
              <UBadge
                :color="environment.status === 'disabled' ? 'neutral' : environment.activeRevisionId ? 'success' : 'warning'"
                variant="subtle"
                size="sm"
                class="cursor-pointer"
              >
                {{ environment.name }}
              </UBadge>
            </UDropdownMenu>
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
        <template #actions-cell="{ row }">
          <div class="text-right">
            <UDropdownMenu :items="workspaceItems(row.original)" :content="{ align: 'end' }">
              <UButton
                icon="i-lucide-ellipsis"
                color="neutral"
                variant="ghost"
                size="sm"
              />
            </UDropdownMenu>
          </div>
        </template>
        <template #empty-actions>
          <UButton size="sm" icon="i-lucide-plus" @click="openCreateWorkspace">
            {{ $t('admin.apis.routing.actions.createWorkspace') }}
          </UButton>
        </template>
      </DashboardDataTable>
    </DashboardTableCard>

    <AdminPlatformWorkspaceModal
      v-model:open="modalOpen"
      :workspace="editingWorkspace"
      @saved="handleSaved"
    />
    <AdminPlatformEnvironmentModal
      v-if="environmentWorkspace"
      v-model:open="environmentModalOpen"
      :workspace="environmentWorkspace"
      :environment="editingEnvironment"
      @saved="context.refresh"
    />
  </div>
</template>

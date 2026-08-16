<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { useAdminPlatformContext } from '~/composables/admin/use-admin-platform-context'
import { usePrivateResource } from '~/composables/dashboard/use-private-resource'
import type { PlatformProduct } from '~/types/platform'
import { parseFetchError } from '~/utils/client-error'
import { formatPlatformDate, platformStatusColor } from '~/utils/platform-display'

const { t, locale } = useI18n()
const context = useAdminPlatformContext()
const modalOpen = ref(false)

useHead({ title: () => t('admin.apis.routing.sections.productsTitle') })

const resource = usePrivateResource<PlatformProduct[]>({
  path: '/api/admin/v1/products',
  defaultData: () => [],
  immediate: false,
  query: () => context.selectedWorkspaceId.value
    ? { workspaceId: context.selectedWorkspaceId.value }
    : undefined
})
const products = computed(() => resource.data.value.filter(
  product => product.workspaceId === context.selectedWorkspaceId.value
))

watch(context.selectedWorkspaceId, (workspaceId) => {
  if (workspaceId) void resource.refresh()
}, { immediate: true })

const columns = computed<TableColumn<PlatformProduct>[]>(() => [
  { id: 'product', header: t('admin.apis.routing.columns.product') },
  { id: 'versions', header: t('admin.apis.routing.columns.versions') },
  { id: 'visibility', header: t('admin.apis.routing.columns.visibility') },
  { id: 'lifecycle', header: t('admin.apis.routing.columns.lifecycle') },
  { id: 'createdAt', header: t('admin.apis.routing.columns.createdAt') }
])
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div class="max-w-3xl">
        <h1 class="text-2xl font-semibold tracking-tight text-highlighted">
          {{ $t('admin.apis.routing.sections.productsTitle') }}
        </h1>
        <p class="mt-2 text-sm leading-6 text-muted">
          {{ $t('admin.apis.routing.sections.productsDescription') }}
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-refresh-cw"
          :loading="resource.loading.value"
          @click="resource.refresh"
        >
          {{ $t('common.actions.refresh') }}
        </UButton>
        <UButton
          icon="i-lucide-plus"
          :disabled="!context.selectedWorkspace.value"
          @click="modalOpen = true"
        >
          {{ $t('admin.apis.routing.actions.createProduct') }}
        </UButton>
      </div>
    </div>

    <AdminPlatformContextBar :show-environment="false" />

    <UAlert
      v-if="resource.error.value"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :title="$t('common.feedback.loadFailed')"
      :description="parseFetchError(resource.error.value, $t('common.feedback.loadFailed'))"
    >
      <template #actions>
        <UButton
          color="error"
          variant="soft"
          size="xs"
          @click="resource.refresh"
        >
          {{ $t('common.actions.retry') }}
        </UButton>
      </template>
    </UAlert>

    <DashboardTableCard
      :title="$t('admin.apis.routing.sections.productsTitle')"
      :description="$t('admin.apis.routing.sections.productsDescription')"
      :total="products.length"
      icon="i-lucide-package-open"
    >
      <DashboardDataTable
        :data="products"
        :columns="columns"
        :loading="resource.loading.value"
        :fixed="false"
        :empty-title="$t('admin.apis.routing.empty.productsTitle')"
        :empty-description="$t('admin.apis.routing.empty.productsDescription')"
        empty-icon="i-lucide-package-plus"
      >
        <template #product-cell="{ row }">
          <div class="min-w-48">
            <p class="text-sm font-semibold text-highlighted">
              {{ row.original.name }}
            </p>
            <p class="font-mono text-xs text-muted">
              {{ row.original.slug }}
            </p>
          </div>
        </template>
        <template #versions-cell="{ row }">
          <div class="flex flex-wrap gap-1.5">
            <UBadge
              v-for="version in row.original.versions"
              :key="version.id"
              :color="platformStatusColor(version.state)"
              variant="subtle"
              size="sm"
            >
              {{ version.version }}
            </UBadge>
          </div>
        </template>
        <template #visibility-cell="{ row }">
          {{ $t(`admin.apis.routing.visibility.${row.original.visibility}`) }}
        </template>
        <template #lifecycle-cell="{ row }">
          <UBadge :color="platformStatusColor(row.original.lifecycle)" variant="subtle">
            {{ $t(`admin.apis.routing.lifecycle.${row.original.lifecycle}`) }}
          </UBadge>
        </template>
        <template #createdAt-cell="{ row }">
          <span class="text-xs text-muted">
            {{ formatPlatformDate(row.original.createdAt, locale) }}
          </span>
        </template>
        <template #empty-actions>
          <UButton
            size="sm"
            icon="i-lucide-plus"
            :disabled="!context.selectedWorkspace.value"
            @click="modalOpen = true"
          >
            {{ $t('admin.apis.routing.actions.createProduct') }}
          </UButton>
        </template>
      </DashboardDataTable>
    </DashboardTableCard>

    <AdminPlatformProductModal
      v-if="context.selectedWorkspace.value"
      v-model:open="modalOpen"
      :workspace="context.selectedWorkspace.value"
      @saved="resource.refresh"
    />
  </div>
</template>

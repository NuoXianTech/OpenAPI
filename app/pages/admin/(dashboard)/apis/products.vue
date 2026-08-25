<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import { usePrivateResource } from '~/composables/dashboard/use-private-resource'
import type { PlatformApiVersion, PlatformProduct } from '#shared/types/platform'
import { parseFetchError } from '~/utils/client-error'
import { formatPlatformDate, platformStatusColor } from '~/utils/platform-display'

const { t, locale } = useI18n()
const modalOpen = ref(false)
const editingProduct = ref<PlatformProduct | null>(null)
const versionModalOpen = ref(false)
const versionProduct = ref<PlatformProduct | null>(null)
const editingVersion = ref<PlatformApiVersion | null>(null)
const toast = useToast()
const confirm = useConfirmDialog()

useHead({ title: () => t('admin.apis.routing.sections.productsTitle') })

const resource = usePrivateResource<PlatformProduct[]>({
  path: '/api/admin/v1/products',
  defaultData: () => []
})
const products = computed(() => resource.data.value)

const columns = computed<TableColumn<PlatformProduct>[]>(() => [
  { id: 'product', header: t('admin.apis.routing.columns.product') },
  { id: 'versions', header: t('admin.apis.routing.columns.versions') },
  { id: 'visibility', header: t('admin.apis.routing.columns.visibility') },
  { id: 'lifecycle', header: t('admin.apis.routing.columns.lifecycle') },
  { id: 'createdAt', header: t('admin.apis.routing.columns.createdAt') },
  { id: 'actions', header: '' }
])

function openCreateProduct() {
  editingProduct.value = null
  modalOpen.value = true
}

function openEditProduct(product: PlatformProduct) {
  editingProduct.value = product
  modalOpen.value = true
}

function openVersion(product: PlatformProduct, version: PlatformApiVersion | null = null) {
  versionProduct.value = product
  editingVersion.value = version
  versionModalOpen.value = true
}

async function refreshProducts() {
  await resource.refresh()
  if (versionProduct.value) {
    versionProduct.value = products.value.find(item => item.id === versionProduct.value?.id) ?? null
  }
}

async function removeProduct(product: PlatformProduct) {
  await confirm({
    title: t('admin.apis.routing.deleteProduct.title', { name: product.name }),
    description: t('admin.apis.routing.deleteProduct.description'),
    confirmColor: 'error',
    onConfirm: async () => {
      try {
        await $fetch(
          `/api/admin/v1/products/${product.id}`,
          { method: 'DELETE' }
        )
        toast.add({ title: t('common.feedback.deleted'), color: 'success' })
        await refreshProducts()
      } catch (error: unknown) {
        toast.add({ title: parseFetchError(error, t('common.feedback.deleteFailed')), color: 'error' })
        throw error
      }
    }
  })
}

async function removeVersion(product: PlatformProduct, version: PlatformApiVersion) {
  await confirm({
    title: t('admin.apis.routing.deleteVersion.title', { version: version.version }),
    description: t('admin.apis.routing.deleteVersion.description'),
    confirmColor: 'error',
    onConfirm: async () => {
      try {
        await $fetch(
          `/api/admin/v1/versions/${version.id}`,
          { method: 'DELETE' }
        )
        toast.add({ title: t('common.feedback.deleted'), color: 'success' })
        await refreshProducts()
      } catch (error: unknown) {
        toast.add({ title: parseFetchError(error, t('common.feedback.deleteFailed')), color: 'error' })
        throw error
      }
    }
  })
}

function productItems(product: PlatformProduct): DropdownMenuItem[][] {
  return [[
    { label: t('common.actions.edit'), icon: 'i-lucide-pencil', onSelect: () => openEditProduct(product) },
    { label: t('admin.apis.routing.actions.createVersion'), icon: 'i-lucide-git-branch-plus', onSelect: () => openVersion(product) }
  ], [
    { label: t('common.actions.delete'), icon: 'i-lucide-trash-2', color: 'error', onSelect: () => removeProduct(product) }
  ]]
}

function versionItems(product: PlatformProduct, version: PlatformApiVersion): DropdownMenuItem[][] {
  return [[
    { label: t('common.actions.edit'), icon: 'i-lucide-pencil', onSelect: () => openVersion(product, version) },
    { label: t('common.actions.delete'), icon: 'i-lucide-trash-2', color: 'error', onSelect: () => removeVersion(product, version) }
  ]]
}
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
        <UButton icon="i-lucide-plus" @click="openCreateProduct">
          {{ $t('admin.apis.routing.actions.createProduct') }}
        </UButton>
      </div>
    </div>

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
            <UDropdownMenu
              v-for="version in row.original.versions"
              :key="version.id"
              :items="versionItems(row.original, version)"
            >
              <UBadge
                :color="platformStatusColor(version.state)"
                variant="subtle"
                size="sm"
                class="cursor-pointer"
              >
                {{ version.version }}
              </UBadge>
            </UDropdownMenu>
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
        <template #actions-cell="{ row }">
          <div class="text-right">
            <UDropdownMenu :items="productItems(row.original)" :content="{ align: 'end' }">
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
          <UButton
            size="sm"
            icon="i-lucide-plus"
            @click="openCreateProduct"
          >
            {{ $t('admin.apis.routing.actions.createProduct') }}
          </UButton>
        </template>
      </DashboardDataTable>
    </DashboardTableCard>

    <AdminPlatformProductModal
      v-model:open="modalOpen"
      :product="editingProduct"
      @saved="refreshProducts"
    />
    <AdminPlatformVersionModal
      v-if="versionProduct"
      v-model:open="versionModalOpen"
      :product="versionProduct"
      :version="editingVersion"
      @saved="refreshProducts"
    />
  </div>
</template>

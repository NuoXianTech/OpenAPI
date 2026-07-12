<script setup lang="ts">
import { ADMIN_API_STATUS_ITEMS } from '#shared/config/api-status'
import { useAdminApiForm } from '~/composables/admin/use-admin-api-form'
import { usePrivateResource } from '~/composables/dashboard/use-private-resource'

const state = useAdminApiForm()

const { data: categoriesData } = usePrivateResource<Array<{ id: number, name: string, code: string }>>({
  path: '/api/admin/api-categories/list',
  defaultData: () => []
})
const categoryOptions = computed(() => [
  { label: '未分类', value: null },
  ...categoriesData.value.map(c => ({ label: c.name, value: c.id }))
])

const statusOptions = ADMIN_API_STATUS_ITEMS
</script>

<template>
  <section class="space-y-4 rounded-xl border border-default bg-elevated/30 p-4 lg:col-span-2">
    <div class="flex items-center gap-2">
      <span class="inline-flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <UIcon name="i-mdi-api" class="size-4" />
      </span>
      <div>
        <h3 class="text-sm font-semibold text-highlighted">
          基础信息
        </h3>
        <p class="text-xs text-muted">
          配置接口在前台展示的名称、描述与分类
        </p>
      </div>
    </div>
    <div class="grid gap-3 sm:grid-cols-2">
      <UFormField
        label="名称"
        name="name"
      >
        <UInput
          v-model="state.name"
          class="w-full"
          placeholder="对外展示名称"
        />
      </UFormField>
      <UFormField
        label="状态"
        name="status"
      >
        <USelect
          v-model="state.status"
          class="w-full"
          :items="statusOptions"
        />
      </UFormField>
    </div>
    <UFormField
      label="简短描述"
      name="shortDesc"
    >
      <UInput
        v-model="state.shortDesc"
        class="w-full"
        placeholder="最多50字"
      />
    </UFormField>
    <UFormField
      label="详细描述"
      name="description"
    >
      <UTextarea
        v-model="state.description"
        :rows="3"
        class="w-full"
      />
    </UFormField>
    <div class="grid gap-3 sm:grid-cols-2">
      <UFormField
        label="文档地址"
        name="docUrl"
      >
        <UInput
          v-model="state.docUrl"
          class="w-full"
          placeholder="https://docs.example.com"
        />
      </UFormField>
      <UFormField
        label="分类"
        name="categoryId"
      >
        <USelect
          v-model="state.categoryId"
          class="w-full"
          :items="categoryOptions"
        />
      </UFormField>
    </div>
  </section>
</template>

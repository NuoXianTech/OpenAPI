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
  <div class="space-y-3">
    <div class="grid grid-cols-2 gap-3">
      <UFormField
        label="名称"
        name="name"
      >
        <UInput
          v-model="state.name"
          placeholder="对外展示名称"
        />
      </UFormField>
      <UFormField
        label="状态"
        name="status"
      >
        <USelect
          v-model="state.status"
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
      />
    </UFormField>
    <div class="grid grid-cols-2 gap-3">
      <UFormField
        label="文档地址"
        name="docUrl"
      >
        <UInput
          v-model="state.docUrl"
          placeholder="https://docs.example.com"
        />
      </UFormField>
      <UFormField
        label="分类"
        name="categoryId"
      >
        <USelect
          v-model="state.categoryId"
          :items="categoryOptions"
        />
      </UFormField>
    </div>
  </div>
</template>

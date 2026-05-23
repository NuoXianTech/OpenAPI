<script setup lang="ts">
const state = useAdminApiForm()

const inlineCreate = useTemplateRef<{ toggle: () => void } | null>('inlineCreate')

const { data: categoriesData, refresh: refreshCategories } = useLazyFetch<Array<{ id: number, name: string, code: string }>>('/api/admin/api-categories/list', {
  default: () => []
})
const categoryOptions = computed(() => [
  { label: '未分类', value: null },
  ...((categoriesData.value || []).map(c => ({ label: c.name, value: c.id })))
])

const statusOptions = [
  { label: '正常', value: 1 },
  { label: '异常', value: 0 },
  { label: '未知', value: -1 },
  { label: '维护', value: 2 },
  { label: '废弃', value: 3 }
]

async function onCategoryCreated(id: number) {
  await refreshCategories()
  state.categoryId = id
}
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
        placeholder="最多30字"
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
        <div class="flex gap-2">
          <USelect
            v-model="state.categoryId"
            :items="categoryOptions"
            class="flex-1"
          />
          <UButton
            icon="i-mdi-plus"
            color="neutral"
            variant="outline"
            size="sm"
            type="button"
            @click="inlineCreate?.toggle()"
          />
        </div>
        <AdminCategoryInlineCreate
          ref="inlineCreate"
          @created="onCategoryCreated"
        />
      </UFormField>
    </div>
  </div>
</template>

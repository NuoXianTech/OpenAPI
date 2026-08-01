<script setup lang="ts">
import { API_STATUS } from '#shared/config/api-status'
import type { AdminApiFormState } from '#shared/types/api'
import { useAdminApiForm } from '~/composables/admin/use-admin-api-form'
import { usePrivateResource } from '~/composables/dashboard/use-private-resource'

const state = useAdminApiForm()
const { t } = useI18n()

const { data: categoriesData } = usePrivateResource<Array<{ id: number, name: string, code: string }>>({
  path: '/api/admin/api-categories/list',
  defaultData: () => []
})
const categoryOptions = computed(() => [
  { label: t('admin.apis.form.basic.uncategorized'), value: null },
  ...categoriesData.value.map(c => ({ label: c.name, value: c.id }))
])

const statusOptions = computed<Array<{ label: string, value: AdminApiFormState['status'] }>>(() => [
  { label: t('common.states.automatic'), value: API_STATUS.automatic },
  { label: t('common.states.active'), value: API_STATUS.normal },
  { label: t('common.states.inactive'), value: API_STATUS.abnormal },
  { label: t('common.states.unknown'), value: API_STATUS.unknown },
  { label: t('common.states.maintenance'), value: API_STATUS.maintenance },
  { label: t('common.states.deprecated'), value: API_STATUS.deprecated }
])
</script>

<template>
  <section class="space-y-4 rounded-xl border border-default bg-elevated/30 p-4 lg:col-span-2">
    <div class="flex items-center gap-2">
      <span class="inline-flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <UIcon name="i-mdi-api" class="size-4" />
      </span>
      <div>
        <h3 class="text-sm font-semibold text-highlighted">
          {{ $t('admin.apis.form.basic.title') }}
        </h3>
        <p class="text-xs text-muted">
          {{ $t('admin.apis.form.basic.description') }}
        </p>
      </div>
    </div>
    <div class="grid gap-3 sm:grid-cols-2">
      <UFormField
        :label="$t('admin.apis.form.basic.name')"
        name="name"
      >
        <UInput
          v-model="state.name"
          class="w-full"
          :placeholder="$t('admin.apis.form.basic.namePlaceholder')"
        />
      </UFormField>
      <UFormField
        :label="$t('admin.apis.form.basic.status')"
        :description="$t('admin.apis.form.basic.statusDescription')"
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
      :label="$t('admin.apis.form.basic.shortDescription')"
      name="shortDesc"
    >
      <UInput
        v-model="state.shortDesc"
        class="w-full"
        :placeholder="$t('admin.apis.form.basic.shortDescriptionPlaceholder')"
      />
    </UFormField>
    <UFormField
      :label="$t('admin.apis.form.basic.fullDescription')"
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
        :label="$t('admin.apis.form.basic.documentationUrl')"
        name="docUrl"
      >
        <UInput
          v-model="state.docUrl"
          class="w-full"
          placeholder="https://docs.example.com"
        />
      </UFormField>
      <UFormField
        :label="$t('admin.apis.form.basic.category')"
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

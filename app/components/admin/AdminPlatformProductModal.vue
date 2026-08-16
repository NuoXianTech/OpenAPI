<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '@nuxt/ui'
import type { PlatformProduct, PlatformWorkspace } from '~/types/platform'
import { adminModalUi } from '~/utils/admin-modal-ui'
import { parseFetchError } from '~/utils/client-error'
import { compactFormErrors, maxLengthError, requiredTextError } from '~/utils/form-validation'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{
  workspace: PlatformWorkspace
}>()
const emit = defineEmits<{ saved: [product: PlatformProduct] }>()
const toast = useToast()
const { t } = useI18n()

interface ProductFormState {
  name: string
  slug: string
  summary: string
  description: string
  visibility: 'public' | 'private'
  version: string
}

function initialState(): ProductFormState {
  return {
    name: '',
    slug: '',
    summary: '',
    description: '',
    visibility: 'public',
    version: 'v1'
  }
}

const state = reactive<ProductFormState>(initialState())
const loading = ref(false)
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const visibilityItems = computed(() => [
  { label: t('admin.apis.routing.visibility.public'), value: 'public' },
  { label: t('admin.apis.routing.visibility.private'), value: 'private' }
])

watch(open, (isOpen) => {
  if (isOpen) Object.assign(state, initialState())
})

function validateProductForm(value: Partial<ProductFormState>): FormError<string>[] {
  return compactFormErrors(
    requiredTextError('name', value.name, t('admin.apis.routing.validation.nameRequired')),
    maxLengthError('name', value.name, 160, t('admin.apis.routing.validation.nameMaxLength')),
    requiredTextError('slug', value.slug, t('admin.apis.routing.validation.slugRequired')),
    value.slug && !slugPattern.test(value.slug.trim())
      ? { name: 'slug', message: t('admin.apis.routing.validation.slugInvalid') }
      : null,
    maxLengthError('slug', value.slug, 80, t('admin.apis.routing.validation.slugMaxLength')),
    maxLengthError('summary', value.summary, 300, t('admin.apis.routing.validation.summaryMaxLength')),
    requiredTextError('version', value.version, t('admin.apis.routing.validation.versionRequired'))
  )
}

async function onSubmit(event: FormSubmitEvent<ProductFormState>) {
  loading.value = true
  try {
    const product = await $fetch<PlatformProduct>('/api/admin/v1/products', {
      method: 'POST',
      body: {
        ...event.data,
        workspaceId: props.workspace.id,
        name: event.data.name.trim(),
        slug: event.data.slug.trim(),
        summary: event.data.summary.trim(),
        description: event.data.description.trim(),
        version: event.data.version.trim()
      }
    })
    toast.add({ title: t('admin.apis.routing.feedback.productCreated'), color: 'success' })
    open.value = false
    emit('saved', product)
  } catch (error: unknown) {
    toast.add({ title: parseFetchError(error, t('admin.apis.routing.feedback.createFailed')), color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="$t('admin.apis.routing.productForm.title')"
    :description="$t('admin.apis.routing.productForm.description')"
    :dismissible="!loading"
    :ui="adminModalUi({ content: 'sm:max-w-2xl' })"
  >
    <template #body>
      <UForm
        id="platform-product-form"
        :state="state"
        :validate="validateProductForm"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UAlert
          color="info"
          variant="subtle"
          icon="i-lucide-badge-check"
          :title="$t('admin.apis.routing.productForm.publishedTitle')"
          :description="$t('admin.apis.routing.productForm.publishedDescription')"
        />
        <UAlert
          color="neutral"
          variant="subtle"
          icon="i-lucide-panels-top-left"
          :title="workspace.name"
          :description="workspace.slug"
        />
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField
            name="name"
            :label="$t('admin.apis.routing.fields.name')"
            required
          >
            <UInput
              v-model="state.name"
              :placeholder="$t('admin.apis.routing.productForm.namePlaceholder')"
              class="w-full"
            />
          </UFormField>
          <UFormField
            name="slug"
            :label="$t('admin.apis.routing.fields.slug')"
            :description="$t('admin.apis.routing.fields.slugHelp')"
            required
          >
            <UInput
              v-model="state.slug"
              placeholder="weather"
              class="w-full font-mono"
            />
          </UFormField>
        </div>
        <UFormField
          name="summary"
          :label="$t('admin.apis.routing.fields.summary')"
        >
          <UInput
            v-model="state.summary"
            :placeholder="$t('admin.apis.routing.productForm.summaryPlaceholder')"
            class="w-full"
          />
        </UFormField>
        <UFormField
          name="description"
          :label="$t('admin.apis.routing.fields.description')"
        >
          <UTextarea
            v-model="state.description"
            :rows="3"
            class="w-full"
          />
        </UFormField>
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField
            name="version"
            :label="$t('admin.apis.routing.fields.version')"
            required
          >
            <UInput
              v-model="state.version"
              placeholder="v1"
              class="w-full font-mono"
            />
          </UFormField>
          <UFormField
            name="visibility"
            :label="$t('admin.apis.routing.fields.visibility')"
          >
            <USelect
              v-model="state.visibility"
              :items="visibilityItems"
              value-key="value"
              class="w-full"
            />
          </UFormField>
        </div>
      </UForm>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          color="neutral"
          variant="outline"
          :disabled="loading"
          @click="open = false"
        >
          {{ $t('common.actions.cancel') }}
        </UButton>
        <UButton
          type="submit"
          form="platform-product-form"
          :loading="loading"
        >
          {{ $t('admin.apis.routing.actions.createProduct') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

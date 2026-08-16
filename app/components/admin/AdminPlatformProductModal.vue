<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '@nuxt/ui'
import type { PlatformProduct, PlatformWorkspace } from '~/types/platform'
import { adminModalUi } from '~/utils/admin-modal-ui'
import { parseFetchError } from '~/utils/client-error'
import { compactFormErrors, maxLengthError, requiredTextError } from '~/utils/form-validation'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{
  workspace: PlatformWorkspace
  product?: PlatformProduct | null
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
  lifecycle: 'active' | 'deprecated' | 'retired'
  version: string
}

const isEditing = computed(() => Boolean(props.product))

function initialState(): ProductFormState {
  return {
    name: props.product?.name ?? '',
    slug: props.product?.slug ?? '',
    summary: props.product?.summary ?? '',
    description: props.product?.description ?? '',
    visibility: props.product?.visibility ?? 'public',
    lifecycle: props.product?.lifecycle ?? 'active',
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
const lifecycleItems = computed(() => [
  { label: t('admin.apis.routing.lifecycle.active'), value: 'active' },
  { label: t('admin.apis.routing.lifecycle.deprecated'), value: 'deprecated' },
  { label: t('admin.apis.routing.lifecycle.retired'), value: 'retired' }
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
    !isEditing.value
      ? requiredTextError('version', value.version, t('admin.apis.routing.validation.versionRequired'))
      : null
  )
}

async function onSubmit(event: FormSubmitEvent<ProductFormState>) {
  loading.value = true
  try {
    const product = await $fetch<PlatformProduct>(
      isEditing.value ? `/api/admin/v1/products/${props.product!.id}` : '/api/admin/v1/products',
      {
        method: isEditing.value ? 'PATCH' : 'POST',
        body: {
          ...(isEditing.value ? {} : { workspaceId: props.workspace.id, version: event.data.version.trim() }),
          name: event.data.name.trim(),
          slug: event.data.slug.trim(),
          summary: event.data.summary.trim(),
          description: event.data.description.trim(),
          visibility: event.data.visibility,
          ...(isEditing.value ? { lifecycle: event.data.lifecycle } : {})
        }
      }
    )
    toast.add({ title: t(isEditing.value ? 'admin.apis.routing.feedback.productUpdated' : 'admin.apis.routing.feedback.productCreated'), color: 'success' })
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
    :title="$t(isEditing ? 'admin.apis.routing.productForm.editTitle' : 'admin.apis.routing.productForm.title')"
    :description="$t(isEditing ? 'admin.apis.routing.productForm.editDescription' : 'admin.apis.routing.productForm.description')"
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
            v-if="!isEditing"
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
          <UFormField
            v-if="isEditing"
            name="lifecycle"
            :label="$t('admin.apis.routing.columns.lifecycle')"
          >
            <USelect
              v-model="state.lifecycle"
              :items="lifecycleItems"
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
          {{ $t(isEditing ? 'common.actions.save' : 'admin.apis.routing.actions.createProduct') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

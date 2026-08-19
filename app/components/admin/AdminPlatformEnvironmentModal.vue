<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '@nuxt/ui'
import type { PlatformEnvironment, PlatformWorkspace } from '#shared/types/platform'
import { adminModalUi } from '~/utils/admin-modal-ui'
import { parseFetchError } from '~/utils/client-error'
import { compactFormErrors, requiredTextError } from '~/utils/form-validation'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{
  workspace: PlatformWorkspace
  environment?: PlatformEnvironment | null
}>()
const emit = defineEmits<{ saved: [environment: PlatformEnvironment] }>()
const { t } = useI18n()
const toast = useToast()
const loading = ref(false)
const isEditing = computed(() => Boolean(props.environment))
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const hostPattern = /^(?:\*\.)?(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i

const state = reactive({ slug: '', name: '', defaultDomain: '' })

watch(open, (value) => {
  if (!value) return
  Object.assign(state, {
    slug: props.environment?.slug ?? '',
    name: props.environment?.name ?? '',
    defaultDomain: props.environment?.defaultDomain ?? ''
  })
})

function validate(value: Partial<typeof state>): FormError<string>[] {
  return compactFormErrors(
    requiredTextError('slug', value.slug, t('admin.apis.routing.validation.environmentSlugRequired')),
    value.slug && !slugPattern.test(value.slug.trim())
      ? { name: 'slug', message: t('admin.apis.routing.validation.slugInvalid') }
      : null,
    requiredTextError('name', value.name, t('admin.apis.routing.validation.environmentNameRequired')),
    value.defaultDomain && !hostPattern.test(value.defaultDomain.trim())
      ? { name: 'defaultDomain', message: t('admin.apis.routing.validation.hostInvalid') }
      : null
  )
}

async function submit(event: FormSubmitEvent<typeof state>) {
  loading.value = true
  try {
    const environment = await $fetch<PlatformEnvironment>(
      isEditing.value ? `/api/admin/v1/environments/${props.environment!.id}` : '/api/admin/v1/environments',
      {
        method: isEditing.value ? 'PATCH' : 'POST',
        body: {
          ...(isEditing.value ? {} : { workspaceId: props.workspace.id }),
          slug: event.data.slug.trim(),
          name: event.data.name.trim(),
          defaultDomain: event.data.defaultDomain.trim() || null
        }
      }
    )
    toast.add({
      title: t(isEditing.value
        ? 'admin.apis.routing.feedback.environmentUpdated'
        : 'admin.apis.routing.feedback.environmentCreated'),
      color: 'success'
    })
    open.value = false
    emit('saved', environment)
  } catch (error) {
    toast.add({ title: parseFetchError(error, t('common.feedback.operationFailed')), color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="$t(isEditing ? 'admin.apis.routing.environmentForm.editTitle' : 'admin.apis.routing.environmentForm.createTitle')"
    :description="$t('admin.apis.routing.environmentForm.description', { workspace: workspace.name })"
    :dismissible="!loading"
    :ui="adminModalUi({ content: 'sm:max-w-xl' })"
  >
    <template #body>
      <UForm
        id="platform-environment-form"
        :state="state"
        :validate="validate"
        class="space-y-4"
        @submit="submit"
      >
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField name="name" :label="$t('admin.apis.routing.fields.environmentName')" required>
            <UInput v-model="state.name" class="w-full" />
          </UFormField>
          <UFormField name="slug" :label="$t('admin.apis.routing.fields.environmentSlug')" required>
            <UInput v-model="state.slug" class="w-full font-mono" />
          </UFormField>
        </div>
        <UFormField
          name="defaultDomain"
          :label="$t('admin.apis.routing.fields.defaultDomain')"
          :description="$t('admin.apis.routing.workspaceForm.defaultDomainHelp')"
        >
          <UInput v-model="state.defaultDomain" placeholder="api.example.com" class="w-full font-mono" />
        </UFormField>
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
          form="platform-environment-form"
          :loading="loading"
        >
          {{ $t('common.actions.save') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

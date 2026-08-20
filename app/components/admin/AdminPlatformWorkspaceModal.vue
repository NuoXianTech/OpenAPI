<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '@nuxt/ui'
import type { PlatformWorkspaceSummary } from '#shared/types/platform'
import { adminModalUi } from '~/utils/admin-modal-ui'
import { parseFetchError } from '~/utils/client-error'
import { compactFormErrors, maxLengthError, requiredTextError } from '~/utils/form-validation'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ workspace?: PlatformWorkspaceSummary | null }>()
const emit = defineEmits<{ saved: [workspace: PlatformWorkspaceSummary] }>()
const toast = useToast()
const { t } = useI18n()

interface WorkspaceFormState {
  slug: string
  name: string
  environmentSlug: string
  environmentName: string
  defaultDomain: string
}

const isEditing = computed(() => Boolean(props.workspace))

function initialState(): WorkspaceFormState {
  return {
    slug: props.workspace?.slug ?? '',
    name: props.workspace?.name ?? '',
    environmentSlug: 'development',
    environmentName: 'Development',
    defaultDomain: ''
  }
}

const state = reactive<WorkspaceFormState>(initialState())
const loading = ref(false)
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const hostPattern = /^(?:\*\.)?(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i

watch(open, (isOpen) => {
  if (isOpen) Object.assign(state, initialState())
})

function validateWorkspaceForm(value: Partial<WorkspaceFormState>): FormError<string>[] {
  return compactFormErrors(
    requiredTextError('slug', value.slug, t('admin.apis.routing.validation.slugRequired')),
    value.slug && !slugPattern.test(value.slug.trim())
      ? { name: 'slug', message: t('admin.apis.routing.validation.slugInvalid') }
      : null,
    maxLengthError('slug', value.slug, 80, t('admin.apis.routing.validation.slugMaxLength')),
    requiredTextError('name', value.name, t('admin.apis.routing.validation.nameRequired')),
    maxLengthError('name', value.name, 160, t('admin.apis.routing.validation.nameMaxLength')),
    requiredTextError('environmentSlug', value.environmentSlug, t('admin.apis.routing.validation.environmentSlugRequired')),
    value.environmentSlug && !slugPattern.test(value.environmentSlug.trim())
      ? { name: 'environmentSlug', message: t('admin.apis.routing.validation.slugInvalid') }
      : null,
    requiredTextError('environmentName', value.environmentName, t('admin.apis.routing.validation.environmentNameRequired')),
    value.defaultDomain && !hostPattern.test(value.defaultDomain.trim())
      ? { name: 'defaultDomain', message: t('admin.apis.routing.validation.hostInvalid') }
      : null
  )
}

async function onSubmit(event: FormSubmitEvent<WorkspaceFormState>) {
  loading.value = true
  try {
    const workspace = await $fetch<PlatformWorkspaceSummary>(
      isEditing.value ? `/api/admin/v1/workspaces/${props.workspace!.id}` : '/api/admin/v1/workspaces',
      {
        method: isEditing.value ? 'PATCH' : 'POST',
        body: isEditing.value
          ? {
              slug: event.data.slug.trim(),
              name: event.data.name.trim()
            }
          : {
              slug: event.data.slug.trim(),
              name: event.data.name.trim(),
              environment: {
                slug: event.data.environmentSlug.trim(),
                name: event.data.environmentName.trim(),
                defaultDomain: event.data.defaultDomain.trim() || null
              }
            }
      }
    )
    toast.add({ title: t(isEditing.value ? 'admin.apis.routing.feedback.workspaceUpdated' : 'admin.apis.routing.feedback.workspaceCreated'), color: 'success' })
    open.value = false
    emit('saved', workspace)
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
    :title="$t(isEditing ? 'admin.apis.routing.workspaceForm.editTitle' : 'admin.apis.routing.workspaceForm.title')"
    :description="$t(isEditing ? 'admin.apis.routing.workspaceForm.editDescription' : 'admin.apis.routing.workspaceForm.description')"
    :dismissible="!loading"
    :ui="adminModalUi({ content: 'sm:max-w-2xl' })"
  >
    <template #body>
      <UForm
        id="platform-workspace-form"
        :state="state"
        :validate="validateWorkspaceForm"
        class="space-y-5"
        @submit="onSubmit"
      >
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField
            name="name"
            :label="$t('admin.apis.routing.fields.name')"
            required
          >
            <UInput
              v-model="state.name"
              :placeholder="$t('admin.apis.routing.workspaceForm.namePlaceholder')"
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
              placeholder="team-a"
              class="w-full font-mono"
            />
          </UFormField>
        </div>

        <div v-if="!isEditing" class="rounded-lg border border-default bg-elevated/40 p-4">
          <div class="mb-4 flex items-start gap-3">
            <div class="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <UIcon
                name="i-lucide-panels-top-left"
                class="size-4.5"
              />
            </div>
            <div>
              <h3 class="text-sm font-semibold text-highlighted">
                {{ $t('admin.apis.routing.workspaceForm.environmentTitle') }}
              </h3>
              <p class="mt-1 text-xs leading-5 text-muted">
                {{ $t('admin.apis.routing.workspaceForm.environmentDescription') }}
              </p>
            </div>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField
              name="environmentName"
              :label="$t('admin.apis.routing.fields.environmentName')"
              required
            >
              <UInput
                v-model="state.environmentName"
                class="w-full"
              />
            </UFormField>
            <UFormField
              name="environmentSlug"
              :label="$t('admin.apis.routing.fields.environmentSlug')"
              required
            >
              <UInput
                v-model="state.environmentSlug"
                class="w-full font-mono"
              />
            </UFormField>
          </div>
          <UFormField
            name="defaultDomain"
            :label="$t('admin.apis.routing.fields.defaultDomain')"
            :description="$t('admin.apis.routing.workspaceForm.defaultDomainHelp')"
            class="mt-4"
          >
            <UInput
              v-model="state.defaultDomain"
              placeholder="api.example.com"
              class="w-full font-mono"
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
          form="platform-workspace-form"
          :loading="loading"
        >
          {{ $t(isEditing ? 'common.actions.save' : 'admin.apis.routing.actions.createWorkspace') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

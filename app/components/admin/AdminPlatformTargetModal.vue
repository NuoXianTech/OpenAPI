<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '@nuxt/ui'
import type { PlatformUpstream, PlatformUpstreamTarget, PlatformWorkspaceMutationResult } from '~/types/platform'
import { adminModalUi } from '~/utils/admin-modal-ui'
import { parseFetchError } from '~/utils/client-error'
import { compactFormErrors, integerRangeError, requiredTextError } from '~/utils/form-validation'
import { platformPublicationFeedback } from '~/utils/platform-display'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{
  upstream: PlatformUpstream
  target?: PlatformUpstreamTarget | null
}>()
const emit = defineEmits<{ saved: [target: PlatformUpstreamTarget] }>()
const { t } = useI18n()
const toast = useToast()
const loading = ref(false)

interface TargetFormState {
  baseUrl: string
  weight: number
  enabled: boolean
}

const isEditing = computed(() => Boolean(props.target))
const state = reactive<TargetFormState>({
  baseUrl: '',
  weight: 1,
  enabled: true
})

watch(open, (value) => {
  if (!value) return
  Object.assign(state, {
    baseUrl: props.target?.baseUrl ?? '',
    weight: props.target?.weight ?? 1,
    enabled: props.target?.enabled ?? true
  })
})

function parseTargetUrl(value: string | undefined): URL | null {
  try {
    const url = new URL(value?.trim() ?? '')
    return url.protocol === `${props.upstream.protocol}:` ? url : null
  } catch {
    return null
  }
}

function validate(value: Partial<TargetFormState>): FormError<string>[] {
  return compactFormErrors(
    requiredTextError('baseUrl', value.baseUrl, t('admin.apis.routing.validation.targetRequired')),
    value.baseUrl && !parseTargetUrl(value.baseUrl)
      ? { name: 'baseUrl', message: t('admin.apis.routing.validation.protocolMismatch') }
      : null,
    integerRangeError(
      'weight',
      value.weight,
      t('admin.apis.routing.validation.weightInvalid'),
      1,
      10_000
    )
  )
}

async function submit(event: FormSubmitEvent<TargetFormState>) {
  loading.value = true
  try {
    const target = await $fetch<PlatformWorkspaceMutationResult<PlatformUpstreamTarget>>(
      isEditing.value
        ? `/api/admin/v1/targets/${props.target!.id}`
        : `/api/admin/v1/upstreams/${props.upstream.id}/targets`,
      {
        method: isEditing.value ? 'PATCH' : 'POST',
        body: {
          baseUrl: event.data.baseUrl.trim(),
          weight: event.data.weight,
          enabled: event.data.enabled
        }
      }
    )
    toast.add(platformPublicationFeedback(
      target,
      t(isEditing.value
        ? 'admin.apis.routing.feedback.targetUpdated'
        : 'admin.apis.routing.feedback.targetCreated'),
      t('admin.apis.routing.feedback.savedPendingPublish')
    ))
    open.value = false
    emit('saved', target)
  } catch (error: unknown) {
    toast.add({
      title: parseFetchError(error, t('common.feedback.operationFailed')),
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="$t(isEditing ? 'admin.apis.routing.targetForm.editTitle' : 'admin.apis.routing.targetForm.createTitle')"
    :description="$t('admin.apis.routing.targetForm.description', { upstream: upstream.name })"
    :dismissible="!loading"
    :ui="adminModalUi({ content: 'sm:max-w-xl' })"
  >
    <template #body>
      <UForm
        id="platform-target-form"
        :state="state"
        :validate="validate"
        class="space-y-4"
        @submit="submit"
      >
        <UFormField
          name="baseUrl"
          :label="$t('admin.apis.routing.fields.baseUrl')"
          required
        >
          <UInput
            v-model="state.baseUrl"
            :placeholder="`${upstream.protocol}://service.example.com`"
            class="w-full font-mono"
          />
        </UFormField>
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField
            name="weight"
            :label="$t('admin.apis.routing.fields.weight')"
          >
            <UInputNumber
              v-model="state.weight"
              :min="1"
              :max="10000"
              class="w-full"
            />
          </UFormField>
          <UFormField
            name="enabled"
            :label="$t('admin.apis.routing.fields.targetEnabled')"
          >
            <USwitch v-model="state.enabled" />
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
          form="platform-target-form"
          :loading="loading"
        >
          {{ $t('common.actions.save') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '@nuxt/ui'
import type { PlatformUpstreamSummary, PlatformWorkspace } from '#shared/types/platform'
import { adminModalUi } from '~/utils/admin-modal-ui'
import { parseFetchError } from '~/utils/client-error'
import { compactFormErrors, integerRangeError, maxLengthError, requiredTextError } from '~/utils/form-validation'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{
  workspace: PlatformWorkspace
  upstream?: PlatformUpstreamSummary | null
}>()
const emit = defineEmits<{ saved: [] }>()
const toast = useToast()
const { t } = useI18n()

interface UpstreamTargetFormState {
  baseUrl: string
  weight: number
}

interface UpstreamFormState {
  name: string
  slug: string
  kind: 'internal' | 'external'
  serviceToken: string
  loadBalancing: 'round_robin' | 'weighted'
  targets: UpstreamTargetFormState[]
}

function initialState(): UpstreamFormState {
  return {
    name: props.upstream?.name ?? '',
    slug: props.upstream?.slug ?? '',
    kind: props.upstream?.kind ?? 'internal',
    serviceToken: '',
    loadBalancing: props.upstream?.loadBalancing ?? 'round_robin',
    targets: [{ baseUrl: 'http://openapi-service:8080', weight: 1 }]
  }
}

const state = reactive<UpstreamFormState>(initialState())
const loading = ref(false)
const isEditing = computed(() => Boolean(props.upstream))
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const kindItems = computed(() => [
  {
    label: t('admin.apis.routing.upstreamKinds.internal'),
    value: 'internal',
    description: t('admin.apis.routing.upstreamKinds.internalDescription')
  },
  {
    label: t('admin.apis.routing.upstreamKinds.external'),
    value: 'external',
    description: t('admin.apis.routing.upstreamKinds.externalDescription')
  }
])
const loadBalancingItems = computed(() => [
  { label: t('admin.apis.routing.loadBalancing.roundRobin'), value: 'round_robin' },
  { label: t('admin.apis.routing.loadBalancing.weighted'), value: 'weighted' }
])

watch(open, (isOpen) => {
  if (isOpen) Object.assign(state, initialState())
})

function addTarget() {
  state.targets.push({ baseUrl: '', weight: 1 })
}

function removeTarget(index: number) {
  if (state.targets.length > 1) state.targets.splice(index, 1)
}

function parseTargetUrl(value: string): URL | null {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null
  } catch {
    return null
  }
}

function validateUpstreamForm(value: Partial<UpstreamFormState>): FormError<string>[] {
  const errors = compactFormErrors(
    requiredTextError('name', value.name, t('admin.apis.routing.validation.nameRequired')),
    maxLengthError('name', value.name, 160, t('admin.apis.routing.validation.nameMaxLength')),
    requiredTextError('slug', value.slug, t('admin.apis.routing.validation.slugRequired')),
    value.slug && !slugPattern.test(value.slug.trim())
      ? { name: 'slug', message: t('admin.apis.routing.validation.slugInvalid') }
      : null,
    maxLengthError('slug', value.slug, 80, t('admin.apis.routing.validation.slugMaxLength'))
  )

  if (!isEditing.value && value.kind === 'internal' && (value.serviceToken?.length ?? 0) < 32) {
    errors.push({
      name: 'serviceToken',
      message: t('admin.apis.routing.validation.serviceTokenInvalid')
    })
  }

  if (isEditing.value) return errors

  const targets = value.targets ?? []
  if (targets.length === 0) {
    errors.push({ name: 'targets', message: t('admin.apis.routing.validation.targetRequired') })
    return errors
  }

  const protocols = new Set<string>()
  targets.forEach((target, index) => {
    const name = `targets.${index}.baseUrl`
    const url = parseTargetUrl(target.baseUrl?.trim() ?? '')
    if (!url) {
      errors.push({ name, message: t('admin.apis.routing.validation.targetUrlInvalid') })
    } else {
      protocols.add(url.protocol)
      if (value.kind === 'external' && url.protocol !== 'https:') {
        errors.push({ name, message: t('admin.apis.routing.validation.externalRequiresHttps') })
      }
    }
    const weightError = integerRangeError(
      `targets.${index}.weight`,
      target.weight,
      t('admin.apis.routing.validation.weightInvalid'),
      1,
      10_000
    )
    if (weightError) errors.push(weightError)
  })
  if (protocols.size > 1) {
    errors.push({ name: 'targets', message: t('admin.apis.routing.validation.protocolMismatch') })
  }
  return errors
}

async function onSubmit(event: FormSubmitEvent<UpstreamFormState>) {
  loading.value = true
  try {
    await $fetch(
      isEditing.value ? `/api/admin/v1/upstreams/${props.upstream!.id}` : '/api/admin/v1/upstreams',
      {
        method: isEditing.value ? 'PATCH' : 'POST',
        body: isEditing.value
          ? {
              name: event.data.name.trim(),
              slug: event.data.slug.trim(),
              loadBalancing: event.data.loadBalancing
            }
          : {
              workspaceId: props.workspace.id,
              name: event.data.name.trim(),
              slug: event.data.slug.trim(),
              kind: event.data.kind,
              serviceToken: event.data.kind === 'internal'
                ? event.data.serviceToken
                : undefined,
              loadBalancing: event.data.loadBalancing,
              targets: event.data.targets.map(target => ({
                baseUrl: target.baseUrl.trim(),
                weight: target.weight
              }))
            }
      }
    )
    toast.add({
      title: t(isEditing.value
        ? 'admin.apis.routing.feedback.upstreamUpdated'
        : 'admin.apis.routing.feedback.upstreamCreated'),
      color: 'success'
    })
    open.value = false
    emit('saved')
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
    :title="$t(isEditing ? 'admin.apis.routing.upstreamForm.editTitle' : 'admin.apis.routing.upstreamForm.title')"
    :description="$t(isEditing ? 'admin.apis.routing.upstreamForm.editDescription' : 'admin.apis.routing.upstreamForm.description')"
    :dismissible="!loading"
    :ui="adminModalUi({ content: 'sm:max-w-3xl' })"
  >
    <template #body>
      <UForm
        id="platform-upstream-form"
        :state="state"
        :validate="validateUpstreamForm"
        class="space-y-5"
        @submit="onSubmit"
      >
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField
            v-if="!isEditing"
            name="kind"
            :label="$t('admin.apis.routing.fields.upstreamKind')"
          >
            <USelectMenu
              v-model="state.kind"
              :items="kindItems"
              value-key="value"
              class="w-full"
            />
          </UFormField>
          <UFormField
            name="name"
            :label="$t('admin.apis.routing.fields.name')"
            required
          >
            <UInput
              v-model="state.name"
              :placeholder="$t('admin.apis.routing.upstreamForm.namePlaceholder')"
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
              placeholder="core-api"
              class="w-full font-mono"
            />
          </UFormField>
        </div>

        <UAlert
          color="neutral"
          variant="subtle"
          icon="i-lucide-panels-top-left"
          :title="workspace.name"
          :description="workspace.slug"
        />

        <UFormField
          name="loadBalancing"
          :label="$t('admin.apis.routing.fields.loadBalancing')"
          :description="$t('admin.apis.routing.upstreamForm.loadBalancingHelp')"
        >
          <USelect
            v-model="state.loadBalancing"
            :items="loadBalancingItems"
            value-key="value"
            class="w-full sm:w-72"
          />
        </UFormField>

        <UFormField
          v-if="!isEditing && state.kind === 'internal'"
          name="serviceToken"
          :label="$t('admin.apis.routing.fields.serviceToken')"
          :description="$t('admin.apis.routing.upstreamForm.serviceTokenHelp')"
          required
        >
          <UInput
            v-model="state.serviceToken"
            type="password"
            autocomplete="new-password"
            :placeholder="$t('admin.apis.routing.upstreamForm.serviceTokenPlaceholder')"
            class="w-full font-mono"
          />
        </UFormField>

        <UAlert
          v-if="!isEditing"
          :color="state.kind === 'internal' ? 'info' : 'warning'"
          variant="subtle"
          :icon="state.kind === 'internal' ? 'i-lucide-shield-check' : 'i-lucide-shield-alert'"
          :title="state.kind === 'internal'
            ? $t('admin.apis.routing.upstreamForm.internalTitle')
            : $t('admin.apis.routing.upstreamForm.externalTitle')"
          :description="state.kind === 'internal'
            ? $t('admin.apis.routing.upstreamForm.internalDescription')
            : $t('admin.apis.routing.upstreamForm.externalDescription')"
        />

        <div v-if="!isEditing">
          <div class="mb-3 flex items-center gap-3">
            <div>
              <h3 class="text-sm font-semibold text-highlighted">
                {{ $t('admin.apis.routing.upstreamForm.targetsTitle') }}
              </h3>
              <p class="mt-0.5 text-xs text-muted">
                {{ $t('admin.apis.routing.upstreamForm.targetsDescription') }}
              </p>
            </div>
            <UButton
              class="ms-auto"
              color="neutral"
              variant="outline"
              size="sm"
              icon="i-lucide-plus"
              @click="addTarget"
            >
              {{ $t('admin.apis.routing.actions.addTarget') }}
            </UButton>
          </div>

          <UFormField name="targets">
            <div class="space-y-3">
              <div
                v-for="(target, index) in state.targets"
                :key="index"
                class="rounded-lg border border-default bg-elevated/30 p-4"
              >
                <div class="mb-3 flex items-center gap-2">
                  <span class="font-mono text-xs font-semibold text-toned">
                    {{ $t('admin.apis.routing.upstreamForm.targetLabel', { number: index + 1 }) }}
                  </span>
                  <UButton
                    class="ms-auto"
                    color="error"
                    variant="ghost"
                    size="xs"
                    icon="i-lucide-trash-2"
                    :disabled="state.targets.length === 1"
                    :aria-label="$t('admin.apis.routing.actions.removeTarget')"
                    @click="removeTarget(index)"
                  />
                </div>
                <div
                  class="grid gap-4"
                  :class="state.loadBalancing === 'weighted'
                    ? 'sm:grid-cols-[minmax(0,1fr)_8rem]'
                    : 'sm:grid-cols-1'"
                >
                  <UFormField
                    :name="`targets.${index}.baseUrl`"
                    :label="$t('admin.apis.routing.fields.baseUrl')"
                    required
                  >
                    <UInput
                      v-model="target.baseUrl"
                      placeholder="http://openapi-service:8080"
                      class="w-full font-mono"
                    />
                  </UFormField>
                  <UFormField
                    v-if="state.loadBalancing === 'weighted'"
                    :name="`targets.${index}.weight`"
                    :label="$t('admin.apis.routing.fields.weight')"
                  >
                    <UInputNumber
                      v-model="target.weight"
                      :min="1"
                      :max="10000"
                      class="w-full"
                    />
                  </UFormField>
                </div>
              </div>
            </div>
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
          form="platform-upstream-form"
          :loading="loading"
        >
          {{ $t(isEditing ? 'common.actions.save' : 'admin.apis.routing.actions.createUpstream') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

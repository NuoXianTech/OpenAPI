<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '@nuxt/ui'
import { adminModalUi } from '~/utils/admin-modal-ui'
import { parseFetchError } from '~/utils/client-error'
import {
  compactFormErrors,
  integerError,
  maxLengthError,
  requiredTextError
} from '~/utils/form-validation'

interface ApiCategoryItem {
  id: number
  code: string
  name: string
  description: string | null
  icon: string | null
  color: string | null
  sortOrder: number
  isEnabled: boolean
}

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ item?: ApiCategoryItem | null }>()
const emit = defineEmits<{ saved: [] }>()
const toast = useToast()
const form = useTemplateRef('form')
const { t } = useI18n()

const isEdit = computed(() => !!props.item)

interface ApiCategoryFormState {
  code: string
  name: string
  description: string
  icon: string
  color: string
  sortOrder: number
  isEnabled: boolean
}

function validateCategoryForm(state: Partial<ApiCategoryFormState>): FormError<string>[] {
  return compactFormErrors(
    requiredTextError('code', state.code, t('admin.apis.categories.validation.codeRequired')),
    maxLengthError('code', state.code, 64, t('admin.apis.categories.validation.codeMaxLength')),
    requiredTextError('name', state.name, t('admin.apis.categories.validation.nameRequired')),
    maxLengthError('name', state.name, 64, t('admin.apis.categories.validation.nameMaxLength')),
    integerError('sortOrder', state.sortOrder, t('admin.apis.categories.validation.sortOrderInteger'))
  )
}

const state = reactive<ApiCategoryFormState>({ code: '', name: '', description: '', icon: '', color: '', sortOrder: 0, isEnabled: true })
const loading = ref(false)

watch(() => props.item, (val) => {
  if (val) {
    Object.assign(state, {
      code: val.code,
      name: val.name,
      description: val.description || '',
      icon: val.icon || '',
      color: val.color || '',
      sortOrder: val.sortOrder ?? 0,
      isEnabled: val.isEnabled ?? true
    })
  } else {
    Object.assign(state, { code: '', name: '', description: '', icon: '', color: '', sortOrder: 0, isEnabled: true })
  }
}, { immediate: true })

async function onSubmit(event: FormSubmitEvent<ApiCategoryFormState>) {
  loading.value = true
  try {
    if (isEdit.value) {
      const { code: _code, ...rest } = event.data
      await $fetch('/api/admin/api-categories/update', {
        method: 'PUT',
        body: { id: props.item!.id, ...rest }
      })
    } else {
      await $fetch('/api/admin/api-categories/add', { method: 'POST', body: event.data })
    }
    toast.add({
      title: isEdit.value ? t('admin.apis.categories.feedback.updated') : t('admin.apis.categories.feedback.created'),
      color: 'success'
    })
    open.value = false
    emit('saved')
  } catch (err: unknown) {
    toast.add({ title: parseFetchError(err, t('common.feedback.operationFailed')), color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="isEdit ? $t('admin.apis.categories.form.editTitle') : $t('admin.apis.categories.form.createTitle')"
    :ui="adminModalUi()"
  >
    <template #body>
      <UForm
        ref="form"
        :validate="validateCategoryForm"
        :state="state"
        class="space-y-3"
        @submit="onSubmit"
      >
        <UFormField
          :label="$t('admin.apis.categories.form.code')"
          name="code"
          :help="$t('admin.apis.categories.form.codeHelp')"
        >
          <UInput
            v-model="state.code"
            :disabled="isEdit"
            :placeholder="$t('admin.apis.categories.form.codePlaceholder')"
          />
        </UFormField>
        <UFormField
          :label="$t('admin.apis.categories.form.name')"
          name="name"
        >
          <UInput
            v-model="state.name"
            :placeholder="$t('admin.apis.categories.form.namePlaceholder')"
          />
        </UFormField>
        <UFormField
          :label="$t('admin.apis.categories.form.description')"
          name="description"
        >
          <UTextarea
            v-model="state.description"
            :rows="2"
            class="w-full sm:max-w-lg"
          />
        </UFormField>
        <div class="grid grid-cols-2 gap-3">
          <UFormField
            :label="$t('admin.apis.categories.form.icon')"
            name="icon"
          >
            <UInput
              v-model="state.icon"
              placeholder="i-mdi-robot-outline"
            />
          </UFormField>
          <UFormField
            :label="$t('admin.apis.categories.form.color')"
            name="color"
          >
            <UInput
              v-model="state.color"
              placeholder="primary / #1abc9c"
            />
          </UFormField>
        </div>
        <UFormField
          :label="$t('admin.apis.categories.form.sortOrder')"
          name="sortOrder"
          :help="$t('admin.apis.categories.form.sortOrderHelp')"
        >
          <UInput
            v-model.number="state.sortOrder"
            type="number"
          />
        </UFormField>
        <USwitch
          v-model="state.isEnabled"
          :label="$t('admin.apis.categories.form.enabled')"
        />
      </UForm>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton
          variant="outline"
          color="neutral"
          @click="() => { open = false }"
        >
          {{ $t('common.actions.cancel') }}
        </UButton>
        <UButton
          :loading="loading"
          @click="() => { form?.submit() }"
        >
          {{ isEdit ? $t('common.actions.save') : $t('common.actions.create') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

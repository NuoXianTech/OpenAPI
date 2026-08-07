<script setup lang="ts">
import { adminModalUi } from '~/utils/admin-modal-ui'

const props = defineProps<{
  open: boolean
  logTypeLabel: string
  matchCount: number
  hasFilters: boolean
  loading: boolean
  note?: string
  onConfirm: () => Promise<boolean>
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const allConfirmed = ref(false)

watch(() => props.open, (opened) => {
  if (opened) allConfirmed.value = false
})

function updateOpen(open: boolean) {
  if (!props.loading) emit('update:open', open)
}

async function submit() {
  if (props.loading || (!props.hasFilters && !allConfirmed.value)) return
  if (await props.onConfirm()) emit('update:open', false)
}
</script>

<template>
  <UModal
    :open="open"
    :title="$t('admin.logs.cleanup.title', { type: logTypeLabel })"
    :dismissible="!loading"
    :ui="adminModalUi({ content: 'sm:max-w-lg' })"
    @update:open="updateOpen"
  >
    <template #body>
      <form
        class="space-y-4"
        @submit.prevent="submit"
      >
        <UAlert
          color="error"
          variant="subtle"
          icon="i-lucide-triangle-alert"
          :title="$t('admin.logs.cleanup.warningTitle')"
          :description="$t('admin.logs.cleanup.warning')"
        />

        <p class="text-sm text-toned">
          {{ hasFilters
            ? $t('admin.logs.cleanup.filteredDescription', { count: matchCount })
            : $t('admin.logs.cleanup.allDescription', { count: matchCount }) }}
        </p>

        <p
          v-if="note"
          class="text-xs text-muted"
        >
          {{ note }}
        </p>

        <UCheckbox
          v-if="!hasFilters"
          v-model="allConfirmed"
          :label="$t('admin.logs.cleanup.allConfirm')"
        />
      </form>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          color="neutral"
          variant="outline"
          :disabled="loading"
          @click="updateOpen(false)"
        >
          {{ $t('common.actions.cancel') }}
        </UButton>
        <UButton
          color="error"
          icon="i-lucide-trash-2"
          :loading="loading"
          :disabled="!hasFilters && !allConfirmed"
          @click="submit"
        >
          {{ $t('admin.logs.cleanup.confirm') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

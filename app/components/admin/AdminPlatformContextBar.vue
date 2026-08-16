<script setup lang="ts">
import { useAdminPlatformContext } from '~/composables/admin/use-admin-platform-context'

withDefaults(defineProps<{
  showEnvironment?: boolean
}>(), {
  showEnvironment: true
})

const context = useAdminPlatformContext()
</script>

<template>
  <div class="space-y-3">
    <UAlert
      v-if="context.error.value"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :title="$t('common.feedback.loadFailed')"
    >
      <template #actions>
        <UButton
          color="error"
          variant="soft"
          size="xs"
          @click="context.refresh"
        >
          {{ $t('common.actions.retry') }}
        </UButton>
      </template>
    </UAlert>

    <UCard
      variant="subtle"
      :ui="{ body: 'py-4 sm:py-4' }"
    >
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end">
        <div
          class="grid flex-1 gap-4"
          :class="showEnvironment ? 'sm:grid-cols-2' : 'sm:grid-cols-1'"
        >
          <UFormField :label="$t('admin.apis.routing.fields.workspace')">
            <USelectMenu
              v-model="context.selectedWorkspaceId.value"
              :items="context.workspaceItems.value"
              value-key="value"
              class="w-full"
              :loading="context.loading.value"
              :placeholder="$t('admin.apis.routing.selectWorkspace')"
            />
          </UFormField>
          <UFormField
            v-if="showEnvironment"
            :label="$t('admin.apis.routing.fields.environment')"
          >
            <USelectMenu
              v-model="context.selectedEnvironmentId.value"
              :items="context.environmentItems.value"
              value-key="value"
              class="w-full"
              :disabled="context.environmentItems.value.length === 0"
              :placeholder="$t('admin.apis.routing.selectEnvironment')"
            />
          </UFormField>
        </div>
        <slot />
      </div>
    </UCard>
  </div>
</template>

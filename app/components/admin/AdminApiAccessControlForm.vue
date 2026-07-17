<script setup lang="ts">
import { useAdminApiForm } from '~/composables/admin/use-admin-api-form'

defineProps<{ hasChargedMethod: boolean }>()

const state = useAdminApiForm()
</script>

<template>
  <section class="rounded-xl border border-default bg-elevated/30 p-4 lg:col-span-2">
    <div class="mb-4 flex items-center gap-2">
      <span class="inline-flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <UIcon name="i-mdi-shield-key-outline" class="size-4" />
      </span>
      <div>
        <h3 class="text-sm font-semibold text-highlighted">
          {{ $t('admin.apis.form.access.title') }}
        </h3>
        <p class="text-xs text-muted">
          {{ $t('admin.apis.form.access.description') }}
        </p>
      </div>
    </div>
    <div class="grid gap-3 sm:grid-cols-3">
      <USwitch
        v-model="state.isEnabled"
        :label="$t('admin.apis.form.access.enabled')"
      />
      <USwitch
        v-model="state.isApiKey"
        :label="$t('admin.apis.form.access.apiKey')"
      />
      <USwitch
        v-model="state.isStatistics"
        :label="$t('admin.apis.form.access.statistics')"
        :disabled="!state.isEnabled"
      />
    </div>
    <p
      v-if="!state.isEnabled"
      class="text-xs text-muted mt-2"
    >
      {{ $t('admin.apis.form.access.statisticsRequiresEnabled') }}
    </p>
    <p
      v-if="!state.isApiKey && hasChargedMethod"
      class="text-xs text-warning mt-2"
    >
      {{ $t('admin.apis.form.access.disablingApiKeyClearsCosts') }}
    </p>
  </section>
</template>

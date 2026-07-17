<script setup lang="ts">
import { useAdminApiForm } from '~/composables/admin/use-admin-api-form'

const state = useAdminApiForm()
</script>

<template>
  <section class="rounded-xl border border-default bg-elevated/30 p-4">
    <div class="mb-4 flex items-center gap-2">
      <span class="inline-flex size-8 items-center justify-center rounded-lg bg-info/10 text-info">
        <UIcon name="i-mdi-speedometer" class="size-4" />
      </span>
      <div>
        <h3 class="text-sm font-semibold text-highlighted">
          {{ $t('admin.apis.form.rateLimits.title') }}
        </h3>
        <p class="text-xs text-muted">
          {{ $t('admin.apis.form.rateLimits.description') }}
        </p>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <UFormField
        :label="$t('admin.apis.form.rateLimits.perSecond')"
        name="rateLimitPerSecond"
      >
        <UInput
          v-model.number="state.rateLimitPerSecond"
          class="w-full"
          type="number"
          min="0"
        />
      </UFormField>
      <UFormField
        :label="$t('admin.apis.form.rateLimits.perMinute')"
        name="rateLimitPerMinute"
      >
        <UInput
          v-model.number="state.rateLimitPerMinute"
          class="w-full"
          type="number"
          min="0"
        />
      </UFormField>
      <UFormField
        :label="$t('admin.apis.form.rateLimits.perHour')"
        name="rateLimitPerHour"
      >
        <UInput
          v-model.number="state.rateLimitPerHour"
          class="w-full"
          type="number"
          min="0"
        />
      </UFormField>
      <UFormField
        :label="$t('admin.apis.form.rateLimits.perDay')"
        name="rateLimitPerDay"
      >
        <UInput
          v-model.number="state.rateLimitPerDay"
          class="w-full"
          type="number"
          min="0"
        />
      </UFormField>
      <UFormField
        :label="$t('admin.apis.form.rateLimits.dailyQuota')"
        name="dailyQuota"
      >
        <UInput
          v-model.number="state.dailyQuota"
          class="w-full"
          type="number"
          min="0"
        />
      </UFormField>
      <UFormField
        :label="$t('admin.apis.form.rateLimits.timeoutMs')"
        name="timeoutMs"
      >
        <UInput
          v-model.number="state.timeoutMs"
          class="w-full"
          type="number"
          min="0"
        />
      </UFormField>
    </div>
  </section>
</template>

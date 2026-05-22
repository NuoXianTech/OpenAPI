<script setup lang="ts">
defineProps<{
  icon: string
  title: string
  subtitle?: string
}>()
</script>

<template>
  <div class="auth-brand">
    <div class="auth-brand__logo">
      <UIcon
        :name="icon"
        class="size-6"
      />
    </div>
    <div>
      <h1 class="auth-brand__title">
        {{ title }}
      </h1>
      <p
        v-if="subtitle"
        class="auth-brand__subtitle"
      >
        {{ subtitle }}
      </p>
    </div>
  </div>
</template>

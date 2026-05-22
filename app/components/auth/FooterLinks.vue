<script setup lang="ts">
interface AuthFooterLink {
  label: string
  to: string
}

defineProps<{
  prefix?: string
  links: AuthFooterLink[]
}>()
</script>

<template>
  <div class="auth-footer-links">
    <span v-if="prefix">{{ prefix }}</span>
    <template
      v-for="(link, index) in links"
      :key="link.to"
    >
      <span
        v-if="index > 0"
        class="text-dimmed"
      >·</span>
      <UButton
        variant="link"
        size="sm"
        :to="link.to"
        class="px-0"
      >
        {{ link.label }}
      </UButton>
    </template>
  </div>
</template>

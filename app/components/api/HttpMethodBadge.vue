<script setup lang="ts">
type HttpMethodBadgeSize = 'xs' | 'sm'

const props = withDefaults(defineProps<{
  method: string
  size?: HttpMethodBadgeSize
}>(), {
  size: 'sm'
})

const normalizedMethod = computed(() => props.method.trim().toUpperCase() || 'HTTP')
const methodTone = computed(() => {
  switch (normalizedMethod.value) {
    case 'GET':
    case 'HEAD':
      return 'blue'
    case 'POST':
      return 'violet'
    case 'PUT':
    case 'PATCH':
      return 'amber'
    case 'DELETE':
      return 'rose'
    default:
      return 'ink'
  }
})
</script>

<template>
  <span
    class="http-method-badge"
    :class="[`is-${methodTone}`, `is-${size}`]"
  >
    {{ normalizedMethod }}
  </span>
</template>

<style scoped>
.http-method-badge {
  --http-method-accent: var(--ui-text-toned);
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  border: 1px solid color-mix(in oklab, var(--http-method-accent) 30%, var(--ui-border));
  border-radius: 5px;
  background: color-mix(in oklab, var(--http-method-accent) 7%, var(--ui-bg-elevated));
  color: color-mix(in oklab, var(--http-method-accent) 88%, var(--ui-text-highlighted));
  box-shadow: inset 0 1px 0 color-mix(in oklab, white 52%, transparent);
  font-family: var(--font-code);
  font-weight: 750;
  letter-spacing: 0.025em;
  line-height: 1;
  white-space: nowrap;
}

.http-method-badge.is-xs {
  min-height: 1.35rem;
  padding-inline: 0.42rem;
  font-size: 0.625rem;
}

.http-method-badge.is-sm {
  min-height: 1.5rem;
  padding-inline: 0.5rem;
  font-size: 0.6875rem;
}

.http-method-badge.is-blue { --http-method-accent: var(--api-spectrum-blue); }
.http-method-badge.is-violet { --http-method-accent: var(--api-spectrum-violet); }
.http-method-badge.is-amber { --http-method-accent: var(--api-spectrum-amber); }
.http-method-badge.is-rose { --http-method-accent: var(--api-spectrum-rose); }

.dark .http-method-badge {
  border-color: color-mix(in oklab, var(--http-method-accent) 38%, var(--ui-border));
  background: color-mix(in oklab, var(--http-method-accent) 13%, var(--ui-bg-elevated));
  color: color-mix(in oklab, var(--http-method-accent) 92%, white);
  box-shadow: inset 0 1px 0 color-mix(in oklab, white 8%, transparent);
}
</style>

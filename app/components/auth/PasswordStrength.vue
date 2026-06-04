<script setup lang="ts">
const props = defineProps<{
  password: string
}>()

const requirements = [
  { regex: /.{8,}/, text: '至少 8 个字符' },
  { regex: /\d/, text: '至少 1 个数字' },
  { regex: /[a-z]/, text: '至少 1 个小写字母' },
  { regex: /[A-Z]/, text: '至少 1 个大写字母' }
]

const strength = computed(() => requirements.map(req => ({
  met: req.regex.test(props.password),
  text: req.text
})))

const score = computed(() => strength.value.filter(req => req.met).length)

const color = computed<'neutral' | 'error' | 'warning' | 'success'>(() => {
  if (!props.password) return 'neutral'
  if (score.value <= 2) return 'error'
  if (score.value === 3) return 'warning'
  return 'success'
})

const text = computed(() => {
  if (!props.password) return ''
  if (score.value <= 2) return '弱'
  if (score.value === 3) return '中'
  return '强'
})
</script>

<template>
  <Transition name="state-fade">
    <div
      v-if="password"
      class="auth-password-strength"
    >
      <UProgress
        :color="color"
        :model-value="score"
        :max="4"
        size="xs"
      />
      <p class="auth-password-strength__label">
        密码强度：<span :class="`auth-password-strength__value auth-password-strength__value--${color}`">{{ text }}</span>
      </p>
    </div>
  </Transition>
</template>

<style scoped>
.auth-password-strength {
  margin-top: 8px;
}

.auth-password-strength__label {
  margin-top: 4px;
  font-size: 12px;
  color: var(--ui-text-muted);
}

.auth-password-strength__value {
  font-weight: 500;
}

.auth-password-strength__value--success { color: var(--ui-color-success-500); }
.auth-password-strength__value--warning { color: var(--ui-color-warning-500); }
.auth-password-strength__value--error { color: var(--ui-color-error-500); }
.auth-password-strength__value--neutral { color: var(--ui-text-muted); }
</style>

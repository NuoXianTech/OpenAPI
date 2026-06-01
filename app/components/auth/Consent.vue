<script setup lang="ts">
// 登录 / 注册时的「同意条款」勾选框。仅当后台配置了服务条款或隐私政策链接时才会被父级渲染。
const modelValue = defineModel<boolean>({ default: false })

const { settings } = useSiteSettings()
const termsUrl = computed(() => settings.value.termsUrl || '')
const privacyUrl = computed(() => settings.value.privacyUrl || '')
</script>

<template>
  <div class="auth-consent">
    <UCheckbox
      v-model="modelValue"
      size="sm"
      aria-label="同意服务条款与隐私政策"
    />
    <p class="auth-consent__text">
      我已阅读并同意
      <ULink
        v-if="termsUrl"
        :to="termsUrl"
        target="_blank"
        class="text-primary font-medium hover:underline"
      >
        《服务条款》
      </ULink>
      <template v-if="termsUrl && privacyUrl">
        和
      </template>
      <ULink
        v-if="privacyUrl"
        :to="privacyUrl"
        target="_blank"
        class="text-primary font-medium hover:underline"
      >
        《隐私政策》
      </ULink>
    </p>
  </div>
</template>

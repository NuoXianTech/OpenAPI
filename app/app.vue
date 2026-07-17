<script setup lang="ts">
import { zh_cn } from '@nuxt/ui/locale'
import { DEFAULT_LOCALE } from '#shared/config/locale-defaults'

// 站点元信息（标题模板、favicon、描述）统一由 siteSettings 提供，
// 各 page 通过 useHead({ title }) 声明本页标题，模板自动拼上 siteName。
const { settings } = useSiteSettings()

const link = computed(() => [
  { rel: 'icon', type: 'image/x-icon', href: settings.value.siteImg || '/favicon.ico' }
])

useHead({
  titleTemplate: title => (typeof title === 'string' && title.length)
    ? `${title} - ${settings.value.siteName}`
    : settings.value.siteName,
  htmlAttrs: { lang: DEFAULT_LOCALE },
  meta: [
    { name: 'description', content: () => settings.value.siteDescription }
  ],
  link
})
</script>

<template>
  <UApp :locale="zh_cn">
    <NuxtLoadingIndicator
      color="repeating-linear-gradient(to right,#10b981 0%,#3b82f6 50%,#8b5cf6 100%)"
      :height="2"
    />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

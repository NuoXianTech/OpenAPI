<script lang="ts" setup>
// 站点元信息（标题模板、favicon、描述）统一由 siteSettings 提供，
// 各 page 通过 useHead({ title }) 声明本页标题，模板自动拼上 siteName。
const { settings } = useSiteSettings()

useHead({
  titleTemplate: title => (typeof title === 'string' && title.length)
    ? `${title} - ${settings.value.siteName}`
    : settings.value.siteName,
  htmlAttrs: { lang: 'zh-CN' },
  meta: [
    { name: 'description', content: () => settings.value.siteDescription }
  ],
  link: [
    { rel: 'icon', type: 'image/x-icon', href: () => settings.value.siteImg || '/favicon.ico' }
  ]
})
</script>

<template>
  <UApp>
    <NuxtLoadingIndicator
      color="repeating-linear-gradient(to right,#10b981 0%,#3b82f6 50%,#8b5cf6 100%)"
      :height="2"
    />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

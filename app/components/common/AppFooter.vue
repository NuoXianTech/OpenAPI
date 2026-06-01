<script setup lang="ts">
const { settings } = useSiteSettings()

const currentYear = new Date().getFullYear()
const startYear = computed(() => {
  const y = new Date(settings.value.startTime).getFullYear()
  return Number.isFinite(y) ? y : currentYear
})
const yearLabel = computed(() =>
  startYear.value < currentYear ? `${startYear.value}-${currentYear}` : `${currentYear}`
)

const icpBeian = computed(() => settings.value.icpBeian || '')
const policeBeian = computed(() => settings.value.policeBeian || '')
const hasBeian = computed(() => Boolean(icpBeian.value || policeBeian.value))
</script>

<template>
  <footer class="text-center pb-10 text-xs text-muted mt-6">
    <div class="mb-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
      <UButton
        to="/friend-links"
        variant="link"
        color="neutral"
        size="xs"
        class="px-0"
      >
        友情链接
      </UButton>
      <UButton
        to="/stats"
        variant="link"
        color="neutral"
        size="xs"
        class="px-0"
      >
        调用统计
      </UButton>
      <UButton
        to="/admin/login"
        variant="link"
        color="neutral"
        size="xs"
        class="px-0"
      >
        管理入口
      </UButton>
    </div>
    <span>© {{ yearLabel }} <a
      href="#"
      class="hover:underline"
    >{{ settings.siteName }}</a>. All Rights Reserved.</span>
    <div
      v-if="hasBeian"
      class="mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1"
    >
      <a
        v-if="icpBeian"
        href="https://beian.miit.gov.cn/"
        target="_blank"
        rel="noopener noreferrer"
        class="hover:underline"
      >{{ icpBeian }}</a>
      <a
        v-if="policeBeian"
        href="https://beian.mps.gov.cn/"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-1 hover:underline"
      >
        <UIcon
          name="i-mdi-shield-check-outline"
          class="size-3.5"
        />
        {{ policeBeian }}
      </a>
    </div>
  </footer>
</template>

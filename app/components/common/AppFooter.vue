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
    <span>© {{ yearLabel }} {{ settings.siteName }}. All Rights Reserved.</span>
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

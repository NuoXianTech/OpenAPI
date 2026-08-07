<script setup lang="ts">
import SiteBrand from './SiteBrand.vue'

const { settings } = useSiteSettings()

const currentYear = new Date().getFullYear()
const startYear = computed(() => {
  const year = Number.parseInt(settings.value.startTime.slice(0, 4), 10)
  return Number.isInteger(year) && year > 0 && year <= currentYear ? year : currentYear
})
const yearLabel = computed(() =>
  startYear.value < currentYear ? `${startYear.value}-${currentYear}` : `${currentYear}`
)

const icpBeian = computed(() => settings.value.icpBeian || '')
const policeBeian = computed(() => settings.value.policeBeian || '')
const hasBeian = computed(() => Boolean(icpBeian.value || policeBeian.value))

const footerLinks = [
  { label: 'API', to: '/' },
  { label: 'Status', to: '/stats' },
  { label: 'Links', to: '/friend-links' }
]
</script>

<template>
  <footer class="site-footer">
    <div class="site-footer__inner">
      <div class="site-footer__brand">
        <SiteBrand />
        <p class="site-footer__description">
          {{ settings.siteDescription }}
        </p>
      </div>

      <nav class="site-footer__nav" aria-label="Footer">
        <NuxtLink v-for="link in footerLinks" :key="link.to" :to="link.to">
          {{ link.label }}
        </NuxtLink>
      </nav>

      <div class="site-footer__legal">
        <span>© {{ yearLabel }} {{ settings.siteName }}</span>
        <div v-if="hasBeian" class="flex flex-wrap items-center gap-x-3 gap-y-1">
          <a
            v-if="icpBeian"
            href="https://beian.miit.gov.cn"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ icpBeian }}
          </a>
          <a
            v-if="policeBeian"
            href="https://beian.mps.gov.cn/#/query/webSearch"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ policeBeian }}
          </a>
        </div>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  margin-top: 4rem;
  border-top: 1px solid var(--ui-border);
  background: color-mix(in oklab, var(--ui-bg-elevated) 68%, var(--ui-bg));
}

.site-footer__inner {
  display: grid;
  width: calc(100% - 2rem);
  max-width: 1180px;
  margin-inline: auto;
  gap: 2rem;
  padding-block: 2.5rem 1.5rem;
}

.site-footer__brand {
  display: grid;
  min-width: 0;
  gap: 0.2rem;
}

.site-footer__description {
  max-width: 28rem;
  margin: 0;
  padding-inline-start: 2.625rem;
  color: var(--ui-text-muted);
  font-size: 0.75rem;
  line-height: 1.6;
}

.site-footer__nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1.25rem;
  font-family: var(--font-code);
  font-size: 0.7rem;
  color: var(--ui-text-muted);
}

.site-footer__nav a:hover,
.site-footer__legal a:hover { color: var(--ui-primary); }

.site-footer__legal {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  border-top: 1px solid var(--ui-border);
  padding-top: 1rem;
  color: var(--ui-text-dimmed);
  font-size: 0.7rem;
}

@media (width >= 768px) {
  .site-footer__inner { grid-template-columns: 1fr auto; }
  .site-footer__nav { justify-content: flex-end; }
  .site-footer__legal {
    grid-column: 1 / -1;
    flex-direction: row;
    justify-content: space-between;
  }
}
</style>

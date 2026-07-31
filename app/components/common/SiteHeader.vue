<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import { ADMIN_OVERVIEW_PATH, USER_OVERVIEW_PATH } from '~/constants/dashboard-sections'
import { DEFAULT_LOCALE, isSupportedLocale, type SupportedLocale } from '#shared/config/locale-defaults'

const route = useRoute()
const { settings } = useSiteSettings()
const { user, logout, updateLocalePreference } = useAuth()
const { t, locale, locales, setLocale } = useI18n()
const toast = useToast()
const isChangingLocale = ref(false)

const navigation = computed(() => [
  { label: t('public.navigation.catalog'), to: '/docs', icon: 'i-lucide-blocks' },
  { label: t('public.home.stats'), to: '/stats', icon: 'i-lucide-chart-no-axes-combined' },
  { label: t('public.home.friendLinks'), to: '/friend-links', icon: 'i-lucide-link' }
])

const dashboardPath = computed(() => user.value?.role === 'admin' ? ADMIN_OVERVIEW_PATH : USER_OVERVIEW_PATH)
const dashboardLabel = computed(() => user.value?.role === 'admin'
  ? t('public.home.adminDashboard')
  : t('public.home.userDashboard'))

const languageItems = computed<DropdownMenuItem[]>(() => locales.value.flatMap((item) => {
  const code = typeof item === 'string' ? item : item.code
  if (!isSupportedLocale(code)) return []
  return [{
    label: typeof item === 'string' ? item : item.name || item.code,
    active: code === locale.value,
    trailingIcon: code === locale.value ? 'i-lucide-check' : undefined,
    onSelect: () => void handleLocaleChange(code)
  }]
}))

const mobileItems = computed<DropdownMenuItem[][]>(() => [
  navigation.value.map(item => ({
    label: item.label,
    icon: item.icon,
    to: item.to
  })),
  user.value
    ? [{ label: dashboardLabel.value, icon: 'i-lucide-layout-dashboard', to: dashboardPath.value }]
    : [
        { label: t('auth.login.title'), icon: 'i-lucide-log-in', to: '/login' },
        { label: t('auth.register.title'), icon: 'i-lucide-user-round-plus', to: '/register' }
      ]
])

function isActive(path: string): boolean {
  return path === '/' ? route.path === '/' : route.path.startsWith(path)
}

async function handleLogout(): Promise<void> {
  await logout()
  await navigateTo('/')
}

async function handleLocaleChange(nextLocale: SupportedLocale): Promise<void> {
  if (nextLocale === locale.value || isChangingLocale.value) return

  const previousLocale = isSupportedLocale(locale.value) ? locale.value : DEFAULT_LOCALE
  isChangingLocale.value = true
  try {
    await setLocale(nextLocale)
    if (user.value) await updateLocalePreference(nextLocale)
  } catch {
    await setLocale(previousLocale)
    toast.add({ title: t('common.feedback.updateFailed'), color: 'error' })
  } finally {
    isChangingLocale.value = false
  }
}
</script>

<template>
  <header class="site-header">
    <div class="site-header__inner">
      <NuxtLink
        to="/"
        class="site-brand"
        :aria-label="settings.siteName"
      >
        <span class="site-brand__mark" aria-hidden="true">
          <UIcon name="i-lucide-zap" class="size-4.5" />
        </span>
        <span class="site-brand__copy">
          <strong>{{ settings.siteName }}</strong>
        </span>
      </NuxtLink>

      <nav class="site-nav" :aria-label="$t('public.home.publicNavigation')">
        <NuxtLink
          v-for="item in navigation"
          :key="item.to"
          :to="item.to"
          class="site-nav__link"
          :class="{ 'is-active': isActive(item.to) }"
        >
          {{ item.label }}
        </NuxtLink>
      </nav>

      <div class="site-header__actions">
        <UDropdownMenu :items="languageItems" :content="{ align: 'end' }" :ui="{ content: 'w-40' }">
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            square
            icon="i-lucide-languages"
            :loading="isChangingLocale"
            :aria-label="$t('public.navigation.language')"
          />
        </UDropdownMenu>

        <ClientOnly>
          <UColorModeButton color="neutral" variant="ghost" size="sm" />
          <template #fallback>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              square
              disabled
              icon="i-lucide-sun-moon"
            />
          </template>
        </ClientOnly>

        <ClientOnly>
          <template v-if="user">
            <UButton
              :to="dashboardPath"
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-lucide-layout-dashboard"
              class="hidden sm:inline-flex"
            >
              {{ dashboardLabel }}
            </UButton>
            <UTooltip :text="$t('public.home.logout')">
              <UButton
                color="neutral"
                variant="ghost"
                size="sm"
                square
                icon="i-lucide-log-out"
                :aria-label="$t('public.home.logout')"
                class="hidden sm:inline-flex"
                @click="handleLogout"
              />
            </UTooltip>
          </template>
          <template v-else>
            <UButton
              to="/login"
              color="neutral"
              variant="ghost"
              size="sm"
              class="hidden sm:inline-flex"
            >
              {{ $t('auth.login.title') }}
            </UButton>
            <UButton
              to="/register"
              size="sm"
              icon="i-lucide-rocket"
              class="hidden sm:inline-flex"
            >
              {{ $t('public.navigation.getStarted') }}
            </UButton>
          </template>
          <template #fallback>
            <UButton
              to="/login"
              color="neutral"
              variant="ghost"
              size="sm"
              class="hidden sm:inline-flex"
            >
              {{ $t('auth.login.title') }}
            </UButton>
            <UButton
              to="/register"
              size="sm"
              icon="i-lucide-rocket"
              class="hidden sm:inline-flex"
            >
              {{ $t('public.navigation.getStarted') }}
            </UButton>
          </template>
        </ClientOnly>

        <UDropdownMenu :items="mobileItems" :content="{ align: 'end' }" :ui="{ content: 'w-56' }">
          <UButton
            color="neutral"
            variant="outline"
            size="sm"
            square
            icon="i-lucide-menu"
            :aria-label="$t('public.navigation.openMenu')"
            class="md:hidden"
          />
        </UDropdownMenu>
      </div>
    </div>
  </header>
</template>

<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: 40;
  border-bottom: 1px solid color-mix(in oklab, var(--ui-border) 86%, transparent);
  background: color-mix(in oklab, var(--ui-bg) 94%, transparent);
  backdrop-filter: blur(14px);
}

.site-header__inner {
  display: flex;
  width: calc(100% - 2rem);
  max-width: 1180px;
  height: 64px;
  margin-inline: auto;
  align-items: center;
  gap: 1.5rem;
}

.site-brand {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 0.625rem;
  color: var(--ui-text-highlighted);
}

.site-brand__mark {
  display: grid;
  width: 2rem;
  height: 2rem;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 7px;
  color: white;
  background: var(--ui-primary);
  box-shadow: inset 0 0 0 1px color-mix(in oklab, white 18%, transparent);
}

.site-brand__copy {
  display: flex;
  align-items: center;
  line-height: 1;
}

.site-brand__copy strong {
  max-width: 13rem;
  overflow: hidden;
  font-family: var(--font-display);
  font-size: 0.875rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.site-nav {
  display: none;
  align-items: center;
  gap: 0.25rem;
}

.site-nav__link {
  position: relative;
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  color: var(--ui-text-muted);
  font-size: 0.8125rem;
  transition: color 160ms ease, background-color 160ms ease;
}

.site-nav__link:hover {
  color: var(--ui-text-highlighted);
  background: color-mix(in oklab, var(--ui-primary) 6%, transparent);
}

.site-nav__link.is-active {
  color: var(--ui-text-highlighted);
  background: transparent;
  font-weight: 650;
}

.site-header__actions {
  display: flex;
  margin-left: auto;
  align-items: center;
  gap: 0.25rem;
}

@media (width >= 768px) {
  .site-nav { display: flex; }
}
</style>

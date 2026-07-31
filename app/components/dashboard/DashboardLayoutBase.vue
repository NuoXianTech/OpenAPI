<script setup lang="ts">
import type { DashboardStaticConfig } from '~/constants/dashboard-config'
import {
  dashboardConfigInjectionKey,
  type ResolvedDashboardConfig
} from '~/composables/dashboard/use-dashboard-config'

interface DashboardLayoutBaseProps {
  config: DashboardStaticConfig
}

const props = defineProps<DashboardLayoutBaseProps>()

const { settings } = useSiteSettings()

const siteName = computed(() => settings.value?.siteName || 'OpenAPI')

const resolved = computed<ResolvedDashboardConfig>(() => ({
  ...props.config,
  brand: props.config.brand(siteName.value)
}))

provide(dashboardConfigInjectionKey, resolved)

const open = ref(false)

const navigationMenuUi = {
  root: 'dashboard-sidebar-menu',
  list: 'space-y-1',
  item: 'min-w-0',
  link: 'dashboard-sidebar-link min-h-10 rounded-lg px-3 py-2',
  linkLeadingIcon: 'dashboard-sidebar-link-icon size-[18px]',
  linkLabel: 'dashboard-sidebar-link-label font-medium',
  linkTrailing: 'dashboard-sidebar-link-trailing',
  label: 'dashboard-sidebar-menu-label'
}
</script>

<template>
  <UDashboardGroup
    class="dashboard-shell dashboard-shell-refined"
    unit="rem"
    :storage-key="`dashboard-${resolved.id}-sidebar-v2`"
  >
    <UDashboardSidebar
      :id="resolved.id"
      v-model:open="open"
      collapsible
      :default-size="15.5"
      :collapsed-size="4.25"
      class="dashboard-sidebar"
      :ui="{
        root: 'border-e-0',
        header: 'h-auto px-3 pb-2.5 pt-3',
        body: 'gap-5 px-3 py-3',
        footer: 'border-t border-muted px-3 pb-3 pt-2.5'
      }"
    >
      <template #header="{ collapsed }">
        <div
          class="dashboard-sidebar-brand"
          :class="{ 'dashboard-sidebar-brand-collapsed': collapsed }"
        >
          <UButton
            :to="resolved.brand.to"
            :aria-label="`${resolved.brand.label} · ${resolved.brand.workspaceLabel}`"
            color="neutral"
            variant="ghost"
            block
            :square="collapsed"
            class="dashboard-brand-trigger"
          >
            <template #leading>
              <span class="dashboard-brand-mark">
                <UIcon
                  :name="resolved.brand.icon"
                  class="dashboard-brand-icon size-[18px]"
                />
              </span>
            </template>

            <template v-if="!collapsed" #default>
              <span class="dashboard-brand-copy">
                <span class="dashboard-brand-name">{{ resolved.brand.label }}</span>
                <span class="dashboard-brand-workspace">{{ resolved.brand.workspaceLabel }}</span>
              </span>
              <span class="dashboard-brand-badge">{{ resolved.brand.workspaceCode }}</span>
            </template>
          </UButton>
        </div>
      </template>

      <template #default="{ collapsed }">
        <div
          v-for="(group, gIdx) in resolved.groups"
          :key="gIdx"
          class="dashboard-sidebar-nav-group"
        >
          <div
            v-if="group.label && !collapsed"
            class="dashboard-sidebar-group-label"
          >
            {{ group.label }}
          </div>
          <UNavigationMenu
            :collapsed="collapsed"
            :items="group.items"
            orientation="vertical"
            color="neutral"
            variant="pill"
            :tooltip="collapsed"
            :ui="navigationMenuUi"
          />
        </div>
      </template>

      <template #footer="{ collapsed }">
        <UNavigationMenu
          :collapsed="collapsed"
          :items="resolved.footerLinks"
          orientation="vertical"
          color="neutral"
          variant="pill"
          class="dashboard-sidebar-footer-menu"
          :tooltip="collapsed"
          :ui="navigationMenuUi"
        />
      </template>
    </UDashboardSidebar>

    <slot />
  </UDashboardGroup>
</template>

<style scoped>
.dashboard-shell {
  min-height: 100dvh;
  background: var(--ui-bg);
}

.dashboard-shell-refined {
  --dashboard-sidebar-bg: var(--ui-bg);
  --dashboard-sidebar-border: var(--ui-border);
  --dashboard-sidebar-hover: var(--ui-bg-muted);
  --dashboard-sidebar-active: var(--ui-bg-accented);
  --dashboard-sidebar-accent: var(--ui-primary);
  --dashboard-sidebar-mark-bg: var(--ui-primary);
  --dashboard-sidebar-mark-border: color-mix(in oklab, var(--ui-primary) 82%, var(--ui-border));
  --dashboard-sidebar-mark-text: var(--ui-bg);
  --dashboard-sidebar-badge-bg: var(--ui-bg-muted);
  --dashboard-sidebar-badge-border: var(--ui-border-muted);
  --dashboard-sidebar-badge-text: var(--ui-text-toned);
}

.dashboard-shell-refined :deep(.dashboard-sidebar) {
  border-inline-end: 1px solid var(--dashboard-sidebar-border);
  background: var(--dashboard-sidebar-bg);
  box-shadow: none;
  backdrop-filter: none;
}

.dashboard-shell-refined :deep(.dashboard-sidebar-brand) {
  display: grid;
  flex: 1;
  min-width: 0;
  width: 100%;
}

.dashboard-shell-refined :deep(.dashboard-sidebar-brand-collapsed) {
  place-items: center;
}

.dashboard-shell-refined :deep(.dashboard-brand-trigger) {
  min-height: 3.25rem;
  justify-content: flex-start;
  gap: 0.625rem;
  padding: 0.375rem 0.5rem;
  border: 1px solid transparent;
  border-radius: 0.75rem;
  background: transparent;
  color: var(--ui-text-highlighted);
  box-shadow: none;
}

.dashboard-shell-refined :deep(.dashboard-brand-trigger:hover) {
  background: var(--dashboard-sidebar-hover);
}

.dashboard-shell-refined :deep(.dashboard-brand-mark) {
  display: grid;
  flex: none;
  width: 2.125rem;
  height: 2.125rem;
  place-items: center;
  border: 1px solid var(--dashboard-sidebar-mark-border);
  border-radius: 0.625rem;
  background: var(--dashboard-sidebar-mark-bg);
}

.dashboard-shell-refined :deep(.dashboard-brand-icon) {
  color: var(--dashboard-sidebar-mark-text);
}

.dashboard-shell-refined :deep(.dashboard-brand-copy) {
  display: grid;
  flex: 1;
  min-width: 0;
  gap: 0.125rem;
  text-align: start;
}

.dashboard-shell-refined :deep(.dashboard-brand-name) {
  overflow: hidden;
  font-size: 0.875rem;
  font-weight: 650;
  line-height: 1.1rem;
  color: var(--ui-text-highlighted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dashboard-shell-refined :deep(.dashboard-brand-workspace) {
  overflow: hidden;
  font-size: 0.6875rem;
  font-weight: 500;
  line-height: 0.9rem;
  color: var(--ui-text-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dashboard-shell-refined :deep(.dashboard-brand-badge) {
  flex: none;
  padding: 0.1875rem 0.3125rem;
  border: 1px solid var(--dashboard-sidebar-badge-border);
  border-radius: 0.3125rem;
  background: var(--dashboard-sidebar-badge-bg);
  font-family: var(--font-code);
  font-size: 0.5625rem;
  font-weight: 700;
  line-height: 0.75rem;
  color: var(--dashboard-sidebar-badge-text);
  letter-spacing: 0.06em;
}

.dashboard-shell-refined :deep(.dashboard-sidebar-nav-group) {
  display: grid;
  gap: 0.375rem;
}

.dashboard-shell-refined :deep(.dashboard-sidebar-group-label) {
  padding: 0 0.75rem 0.125rem;
  font-size: 0.6875rem;
  font-weight: 600;
  line-height: 1rem;
  color: var(--ui-text-dimmed);
  letter-spacing: 0.02em;
}

.dashboard-shell-refined :deep(.dashboard-sidebar-menu) {
  gap: 0.25rem;
}

.dashboard-shell-refined :deep(.dashboard-sidebar-link) {
  position: relative;
  border: 0;
  color: var(--ui-text-muted);
  transition: color 160ms ease;
}

.dashboard-shell-refined :deep(.dashboard-sidebar-link)::before {
  border-radius: 0.625rem;
  transition: background-color 160ms ease;
}

.dashboard-shell-refined :deep(.dashboard-sidebar-link)::after {
  position: absolute;
  z-index: 1;
  top: 50%;
  inset-inline-start: 0.25rem;
  width: 2px;
  height: 1.125rem;
  border-radius: 999px;
  background: var(--dashboard-sidebar-accent);
  content: '';
  opacity: 0;
  transform: translateY(-50%) scaleY(0.45);
  transition: opacity 160ms ease, transform 160ms ease;
}

.dashboard-shell-refined :deep(.dashboard-sidebar-link:hover)::before {
  background: var(--dashboard-sidebar-hover);
}

.dashboard-shell-refined :deep(.dashboard-sidebar-link:hover) {
  color: var(--ui-text-highlighted);
}

.dashboard-shell-refined :deep(.dashboard-sidebar-link-icon) {
  color: var(--ui-text-dimmed);
  transition: color 160ms ease;
}

.dashboard-shell-refined :deep(.dashboard-sidebar-link:hover .dashboard-sidebar-link-icon) {
  color: var(--ui-text);
}

.dashboard-shell-refined :deep(.dashboard-sidebar-link[data-active]) {
  color: var(--ui-text-highlighted);
  box-shadow: none;
}

.dashboard-shell-refined :deep(.dashboard-sidebar-link[data-active])::before {
  background: var(--dashboard-sidebar-active);
}

.dashboard-shell-refined :deep(.dashboard-sidebar-link[data-active])::after {
  opacity: 1;
  transform: translateY(-50%) scaleY(1);
}

.dashboard-shell-refined :deep(.dashboard-sidebar-link[data-active] .dashboard-sidebar-link-icon) {
  color: var(--ui-text-highlighted);
}

.dashboard-shell-refined :deep(.dashboard-sidebar-link-label) {
  letter-spacing: 0;
}

.dashboard-shell-refined :deep(.dashboard-sidebar-footer-menu) {
  width: 100%;
}

.dashboard-shell-refined :deep(.dashboard-sidebar[data-collapsed="true"] .dashboard-brand-trigger),
.dashboard-shell-refined :deep(.dashboard-sidebar[data-collapsed="true"] .dashboard-sidebar-link) {
  justify-content: center;
  padding-inline: 0.5rem;
}

.dashboard-shell-refined :deep(.dashboard-sidebar[data-collapsed="true"] .dashboard-sidebar-link)::after {
  inset-inline-start: 0.125rem;
}

.dashboard-shell-refined :deep([data-slot="body"]) {
  scrollbar-width: thin;
  scrollbar-color: var(--ui-border) transparent;
}

@media (prefers-reduced-motion: reduce) {
  .dashboard-shell-refined :deep(.dashboard-sidebar-link),
  .dashboard-shell-refined :deep(.dashboard-sidebar-link)::before,
  .dashboard-shell-refined :deep(.dashboard-sidebar-link)::after,
  .dashboard-shell-refined :deep(.dashboard-sidebar-link-icon) {
    transition: none;
  }
}
</style>

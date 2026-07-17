<script setup lang="ts">
interface AboutItem {
  key: string
  label: string
  value: string
  icon: string
}

interface StackItem {
  key: string
  label: string
  description: string
}

const { t } = useI18n()

useHead({ title: () => t('admin.system.about.pageTitle') })

const projectItems = computed<AboutItem[]>(() => [
  {
    key: 'name',
    label: t('admin.system.about.project.items.name.label'),
    value: 'OpenAPI',
    icon: 'i-mdi-api'
  },
  {
    key: 'applicationType',
    label: t('admin.system.about.project.items.applicationType.label'),
    value: t('admin.system.about.project.items.applicationType.value'),
    icon: 'i-mdi-transit-connection-variant'
  },
  {
    key: 'managementModel',
    label: t('admin.system.about.project.items.managementModel.label'),
    value: t('admin.system.about.project.items.managementModel.value'),
    icon: 'i-mdi-account-supervisor-outline'
  },
  {
    key: 'runtime',
    label: t('admin.system.about.project.items.runtime.label'),
    value: t('admin.system.about.project.items.runtime.value'),
    icon: 'i-mdi-application-braces-outline'
  }
])

const capabilityItems = computed<StackItem[]>(() => [
  createStackItem('accounts', 'admin.system.about.capabilities.items.accounts'),
  createStackItem('apis', 'admin.system.about.capabilities.items.apis'),
  createStackItem('audit', 'admin.system.about.capabilities.items.audit'),
  createStackItem('operations', 'admin.system.about.capabilities.items.operations'),
  createStackItem('configuration', 'admin.system.about.capabilities.items.configuration')
])

const stackItems = computed<StackItem[]>(() => [
  createStackItem('nuxt', 'admin.system.about.stack.items.nuxt'),
  createStackItem('ui', 'admin.system.about.stack.items.ui'),
  createStackItem('nitro', 'admin.system.about.stack.items.nitro'),
  createStackItem('database', 'admin.system.about.stack.items.database'),
  createStackItem('tooling', 'admin.system.about.stack.items.tooling')
])

const operationItems = computed<StackItem[]>(() => [
  createStackItem('configuration', 'admin.system.about.production.items.configuration'),
  createStackItem('audit', 'admin.system.about.production.items.audit'),
  createStackItem('roles', 'admin.system.about.production.items.roles'),
  createStackItem('migrations', 'admin.system.about.production.items.migrations')
])

function createStackItem(key: string, translationKey: string): StackItem {
  return {
    key,
    label: t(`${translationKey}.label`),
    description: t(`${translationKey}.description`)
  }
}
</script>

<template>
  <div class="dashboard-settings-page">
    <DashboardSettingsSection
      :title="t('admin.system.about.project.title')"
      :description="t('admin.system.about.project.description')"
    >
      <div class="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
        <div
          v-for="item in projectItems"
          :key="item.key"
          class="min-w-0"
        >
          <div class="flex items-center gap-2 text-sm text-muted">
            <UIcon
              :name="item.icon"
              class="size-4"
            />
            <span>{{ item.label }}</span>
          </div>
          <p class="mt-2 text-sm font-medium text-highlighted">
            {{ item.value }}
          </p>
        </div>
      </div>
    </DashboardSettingsSection>

    <DashboardSettingsSection
      :title="t('admin.system.about.capabilities.title')"
      :description="t('admin.system.about.capabilities.description')"
    >
      <div class="divide-y divide-default">
        <div
          v-for="item in capabilityItems"
          :key="item.key"
          class="flex flex-col gap-1 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
        >
          <span class="text-sm font-medium text-highlighted">{{ item.label }}</span>
          <span class="max-w-2xl text-sm text-muted sm:text-right">{{ item.description }}</span>
        </div>
      </div>
    </DashboardSettingsSection>

    <DashboardSettingsSection
      :title="t('admin.system.about.stack.title')"
      :description="t('admin.system.about.stack.description')"
    >
      <div class="divide-y divide-default">
        <div
          v-for="item in stackItems"
          :key="item.key"
          class="py-4 first:pt-0 last:pb-0"
        >
          <h3 class="text-sm font-semibold text-highlighted">
            {{ item.label }}
          </h3>
          <p class="mt-1 text-sm text-muted">
            {{ item.description }}
          </p>
        </div>
      </div>
    </DashboardSettingsSection>

    <DashboardSettingsSection
      :title="t('admin.system.about.production.title')"
      :description="t('admin.system.about.production.description')"
    >
      <div class="divide-y divide-default">
        <div
          v-for="item in operationItems"
          :key="item.key"
          class="flex gap-3 py-4 first:pt-0 last:pb-0"
        >
          <UIcon
            name="i-mdi-check-circle-outline"
            class="mt-0.5 size-4 shrink-0 text-success"
          />
          <div class="min-w-0">
            <h3 class="text-sm font-semibold text-highlighted">
              {{ item.label }}
            </h3>
            <p class="mt-1 text-sm text-muted">
              {{ item.description }}
            </p>
          </div>
        </div>
      </div>
    </DashboardSettingsSection>
  </div>
</template>

<script setup lang="ts">
import { useAdminSettingsPage } from '~/composables/admin/useAdminSettingsPage'

definePageMeta({ layout: 'admin', middleware: 'auth-admin' })

const { form, saving, status, save, dirty, changedKeys, reset } = useAdminSettingsPage()
</script>

<template>
  <Uform
    id="system"
  >
    <UPageCard
      title="基本信息"
      description="These informations will be displayed publicly."
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
    </UPageCard>

    <UPageCard variant="subtle">
      <UFormField
        name="siteName"
        label="站点名称"
        description="Will appear on receipts, invoices, and other communication."
        required
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model="form.siteName"
          autocomplete="off"
        />
      </UFormField>
      <USeparator />
      <UFormField
        name="siteDescription"
        label="站点描述"
        description="Will appear on receipts, invoices, and other communication."
        class="flex max-sm:flex-col justify-between items-start gap-4"
        :ui="{ container: 'w-full' }"
      >
        <UTextarea
          v-model="form.siteDescription"
          :rows="5"
          autoresize
          class="w-full"
        />
      </UFormField>
      <USeparator />
      <UFormField
        name="siteUrl"
        label="站点URL"
        description="Will appear on receipts, invoices, and other communication."
        required
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model="form.siteUrl"
          autocomplete="off"
        />
      </UFormField>
      <USeparator />
      <UFormField
        name="siteImg"
        label="站点图标"
        description="Will appear on receipts, invoices, and other communication."
        required
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model="form.siteImg"
          autocomplete="off"
        />
      </UFormField>
      <USeparator />
      <UFormField
        name="startTime"
        label="运行时间"
        description="Used to sign in, for email receipts and product updates."
        required
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model="form.startTime"
          type="datetime-local"
          autocomplete="off"
        />
      </UFormField>
      <USeparator />
      <UFormField
        name="xxxx"
        label="使用条款链接"
        description="Used to sign in, for email receipts and product updates."
        required
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model="form.startTime"
          autocomplete="off"
        />
      </UFormField>
      <USeparator />
      <UFormField
        name="xxx"
        label="隐私政策链接"
        description="Used to sign in, for email receipts and product updates."
        required
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model="form.startTime"
          autocomplete="off"
        />
      </UFormField>
      <USeparator />
      <UFormField
        name="xxx"
        label="ICP 备案号"
        description="Used to sign in, for email receipts and product updates."
        required
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model="form.startTime"
          autocomplete="off"
        />
      </UFormField>
      <USeparator />
      <UFormField
        name="xxx"
        label="公安备案号"
        description="Used to sign in, for email receipts and product updates."
        required
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model="form.startTime"
          autocomplete="off"
        />
      </UFormField>
    </UPageCard>
  </Uform>

  <Uform
    id="system"
  >
    <UPageCard
      title="每日签到"
      description="These informations will be displayed publicly."
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
    </UPageCard>

    <UPageCard variant="subtle">
      <UFormField
        name="xxx"
        label="启用每日签到"
        description="xxx"
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <USwitch />
      </UFormField>
      <USeparator />
      <UFormField
        name="xxx"
        label="冷却方式"
        description="xxxx"
        class="flex items-center justify-between not-last:pb-4 gap-2"
      >
        <USelect v-model="value" :items="items" />
      </UFormField>
    </UPageCard>
  </Uform>
  <div class="flex flex-1 flex-col max-w-3xl">
    <div
      v-if="status === 'pending'"
      class="text-center text-sm text-muted py-8"
    >
      加载中...
    </div>

    <div
      v-else
      class="space-y-8"
    >
      <AdminSettingsCheckinCard />
    </div>

    <div class="flex-1" />

    <AdminStickySaveBar
      :dirty="dirty"
      :saving="saving"
      :changed-count="changedKeys.length"
      @save="save"
      @reset="reset"
    />
  </div>
</template>

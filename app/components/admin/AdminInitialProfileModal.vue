<script setup lang="ts">
import { useAdminInitialProfile } from '~/composables/admin/use-admin-initial-profile'
import { adminModalUi } from '~/utils/admin-modal-ui'

const {
  open,
  form,
  saving,
  errorMessage,
  canSubmit,
  submit,
  dismiss,
  handleOpenChange
} = useAdminInitialProfile()
</script>

<template>
  <UModal
    :open="open"
    title="完善管理员账号"
    description="可以继续使用默认账号，也可以现在改成你的用户名和邮箱。"
    :dismissible="!saving"
    :close="!saving"
    :ui="adminModalUi({ content: 'sm:max-w-md' })"
    @update:open="handleOpenChange"
  >
    <template #body>
      <form
        class="space-y-4"
        @submit.prevent="submit"
      >
        <UFormField
          label="用户名"
          required
          help="3-32 位，仅限字母、数字、下划线和短横线"
        >
          <UInput
            v-model="form.username"
            icon="i-mdi-account-outline"
            autocomplete="username"
            autofocus
          />
        </UFormField>

        <UFormField
          label="邮箱"
          required
        >
          <UInput
            v-model="form.email"
            type="email"
            icon="i-mdi-email-outline"
            autocomplete="email"
          />
        </UFormField>

        <UAlert
          v-if="errorMessage"
          color="error"
          variant="subtle"
          icon="i-mdi-alert-circle-outline"
          :title="errorMessage"
        />
      </form>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          color="neutral"
          variant="outline"
          :disabled="saving"
          @click="dismiss"
        >
          保持默认
        </UButton>
        <UButton
          color="primary"
          icon="i-mdi-check"
          :loading="saving"
          :disabled="!canSubmit"
          @click="submit"
        >
          保存
        </UButton>
      </div>
    </template>
  </UModal>
</template>

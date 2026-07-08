<script setup lang="ts">
import { useAdminInitialProfile } from '~/composables/admin/use-admin-initial-profile'
import { adminModalUi } from '~/utils/admin-modal-ui'

const {
  open,
  form,
  saving,
  errorMessage,
  canSubmit,
  submit
} = useAdminInitialProfile()
</script>

<template>
  <UModal
    :open="open"
    title="完善管理员账号"
    description="确认用户名和邮箱，并设置新的管理员密码。"
    :dismissible="false"
    :close="false"
    :ui="adminModalUi({ content: 'sm:max-w-md' })"
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

        <UFormField
          label="新密码"
          required
          help="至少 8 位"
        >
          <UInput
            v-model="form.password"
            type="password"
            icon="i-mdi-lock-outline"
            autocomplete="new-password"
          />
        </UFormField>

        <UFormField
          label="确认密码"
          required
        >
          <UInput
            v-model="form.confirmPassword"
            type="password"
            icon="i-mdi-lock-check-outline"
            autocomplete="new-password"
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

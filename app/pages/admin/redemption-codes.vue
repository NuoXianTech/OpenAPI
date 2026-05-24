<script setup lang="ts">
import { adminRedemptionCodesLinks } from '~/constants/admin-sections/redemption-codes'

definePageMeta({ layout: 'admin', middleware: 'auth-admin' })
</script>

<template>
  <AdminSectionShell
    id="admin-redemption-codes"
    title="兑换码"
    :items="adminRedemptionCodesLinks"
  />
</template>

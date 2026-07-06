import type { AdminApiFormState } from '~/types/admin-api'

const KEY: InjectionKey<AdminApiFormState> = Symbol('AdminApiFormState')

export function provideAdminApiForm(state: AdminApiFormState) {
  provide(KEY, state)
}

export function useAdminApiForm(): AdminApiFormState {
  const state = inject(KEY)
  if (!state) throw new Error('useAdminApiForm must be used inside AdminApiModal')
  return state
}

import type { AdminApiFormState } from '#shared/types/api'

const KEY: InjectionKey<AdminApiFormState> = Symbol('AdminApiFormState')

export function provideAdminApiForm(state: AdminApiFormState) {
  provide(KEY, state)
}

export function useAdminApiForm(): AdminApiFormState {
  const state = inject(KEY)
  if (!state) throw new Error('useAdminApiForm must be used inside AdminApiModal')
  return state
}

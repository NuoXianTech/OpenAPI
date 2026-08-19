export interface RegisterInput {
  username: string
  email: string
  password: string
  turnstileToken?: string
}

export interface LoginInput {
  email?: string
  username?: string
  password: string
  remember?: boolean
  turnstileToken?: string
}

export interface RequestPasswordResetInput {
  email: string
  turnstileToken?: string
}

export interface ResetPasswordInput {
  userId: number
  token: string
  newPassword: string
}

export interface ConfirmEmailChangeInput {
  userId: number
  token: string
}

export interface VerifyEmailInput {
  userId: number
  token: string
}

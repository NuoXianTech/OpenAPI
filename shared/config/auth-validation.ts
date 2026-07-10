export const USERNAME_MIN_LENGTH = 3
export const USERNAME_MAX_LENGTH = 32
export const PASSWORD_MIN_LENGTH = 8
export const USERNAME_PATTERN = /^[a-zA-Z0-9_-]+$/

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

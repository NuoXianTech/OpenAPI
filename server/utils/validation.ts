import type { AuthPolicyInput } from '~~/server/service/authPolicyService'

export function validateUsername(username: string, policy: AuthPolicyInput) {
  if (username.length < policy.minUsernameLength || username.length > policy.maxUsernameLength) {
    return `用户名长度需在 ${policy.minUsernameLength}-${policy.maxUsernameLength} 之间`
  }
  return null
}

export function validatePassword(password: string, policy: AuthPolicyInput) {
  if (password.length < policy.minPasswordLength || password.length > policy.maxPasswordLength) {
    return `密码长度需在 ${policy.minPasswordLength}-${policy.maxPasswordLength} 之间`
  }
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    return '密码需包含至少一个大写字母'
  }
  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    return '密码需包含至少一个小写字母'
  }
  if (policy.requireDigit && !/[0-9]/.test(password)) {
    return '密码需包含至少一个数字'
  }
  if (policy.requireSpecial) {
    const escaped = policy.specialChars.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
    const re = new RegExp(`[${escaped}]`)
    if (!re.test(password)) {
      return '密码需包含至少一个特殊字符'
    }
  }
  return null
}

export function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

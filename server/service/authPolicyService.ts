import { authPolicies } from '@nuxthub/db/schema'

export interface AuthPolicyInput {
  minPasswordLength: number
  maxPasswordLength: number
  minUsernameLength: number
  maxUsernameLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireDigit: boolean
  requireSpecial: boolean
  specialChars: string
}

const defaultPolicy: AuthPolicyInput = {
  minPasswordLength: 8,
  maxPasswordLength: 64,
  minUsernameLength: 3,
  maxUsernameLength: 20,
  requireUppercase: true,
  requireLowercase: true,
  requireDigit: true,
  requireSpecial: false,
  specialChars: '!@#$%^&*()-_=+[]{}|;:,.<>/?',
}

export const authPolicyService = {
  defaultPolicy,

  async getPolicy() {
    const res = await db.select().from(authPolicies).limit(1)
    if (res[0]) {
      return res[0]
    }

    const created = await db.insert(authPolicies).values(defaultPolicy).returning()
    return created[0]
  },

  async updatePolicy(input: Partial<AuthPolicyInput>) {
    const policy = await this.getPolicy()
    const next = {
      minPasswordLength: input.minPasswordLength ?? policy.minPasswordLength,
      maxPasswordLength: input.maxPasswordLength ?? policy.maxPasswordLength,
      minUsernameLength: input.minUsernameLength ?? policy.minUsernameLength,
      maxUsernameLength: input.maxUsernameLength ?? policy.maxUsernameLength,
      requireUppercase: input.requireUppercase ?? policy.requireUppercase,
      requireLowercase: input.requireLowercase ?? policy.requireLowercase,
      requireDigit: input.requireDigit ?? policy.requireDigit,
      requireSpecial: input.requireSpecial ?? policy.requireSpecial,
      specialChars: input.specialChars ?? policy.specialChars,
    }

    const res = await db
      .update(authPolicies)
      .set(next)
      .where(authPolicies.id.equals(policy.id))
      .returning()

    return res[0]
  },
}

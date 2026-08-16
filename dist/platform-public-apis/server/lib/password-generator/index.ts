import { randomInt } from 'node:crypto'

export const PASSWORD_GENERATOR_MODES = ['strong', 'alphanumeric', 'numeric'] as const
export const PASSWORD_GENERATOR_ENCODINGS = ['json', 'text', 'markdown', 'md'] as const

export type PasswordGeneratorMode = typeof PASSWORD_GENERATOR_MODES[number]
export type PasswordGeneratorEncoding = typeof PASSWORD_GENERATOR_ENCODINGS[number]
export type PasswordCharacterType = 'lowercase' | 'uppercase' | 'numbers' | 'symbols'

export interface PasswordGeneratorOptions {
  length: number
  mode: PasswordGeneratorMode
}

export interface PasswordGeneratorResult {
  password: string
  length: number
  mode: PasswordGeneratorMode
  character_types: PasswordCharacterType[]
  entropy: number
  strength: '弱' | '中等' | '强' | '极强'
  ambiguous_characters_excluded: true
}

export const DEFAULT_PASSWORD_LENGTH = 16
export const MIN_PASSWORD_LENGTH = 4
export const MAX_PASSWORD_LENGTH = 128
export const DEFAULT_PASSWORD_MODE: PasswordGeneratorMode = 'strong'

const CHARACTER_SETS: Record<PasswordCharacterType, string> = {
  lowercase: 'abcdefghjkmnpqrstuvwxyz',
  uppercase: 'ABCDEFGHJKMNPQRSTUVWXYZ',
  numbers: '23456789',
  symbols: '!@#$%^&*_-+=?'
}

const MODE_CHARACTER_TYPES: Record<PasswordGeneratorMode, readonly PasswordCharacterType[]> = {
  strong: ['lowercase', 'uppercase', 'numbers', 'symbols'],
  alphanumeric: ['lowercase', 'uppercase', 'numbers'],
  numeric: ['numbers']
}

function randomCharacter(characters: string): string {
  return characters[randomInt(characters.length)]!
}

function secureShuffle(characters: string[]): void {
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1)
    const value = characters[index]!
    characters[index] = characters[swapIndex]!
    characters[swapIndex] = value
  }
}

function passwordStrength(entropy: number): PasswordGeneratorResult['strength'] {
  if (entropy < 40) return '弱'
  if (entropy < 64) return '中等'
  if (entropy < 96) return '强'
  return '极强'
}

export function parsePasswordLength(value: string): number | null {
  if (!value) return DEFAULT_PASSWORD_LENGTH
  if (!/^\d+$/.test(value)) return null

  const length = Number(value)
  return Number.isSafeInteger(length) && length >= MIN_PASSWORD_LENGTH && length <= MAX_PASSWORD_LENGTH
    ? length
    : null
}

export function parsePasswordGeneratorMode(value: string): PasswordGeneratorMode | null {
  if (!value) return DEFAULT_PASSWORD_MODE
  const mode = value.toLowerCase()
  return PASSWORD_GENERATOR_MODES.includes(mode as PasswordGeneratorMode)
    ? mode as PasswordGeneratorMode
    : null
}

export function isPasswordGeneratorEncoding(value: string): value is PasswordGeneratorEncoding {
  return PASSWORD_GENERATOR_ENCODINGS.includes(value as PasswordGeneratorEncoding)
}

export function generatePassword(options: PasswordGeneratorOptions): PasswordGeneratorResult {
  if (!Number.isSafeInteger(options.length)
    || options.length < MIN_PASSWORD_LENGTH
    || options.length > MAX_PASSWORD_LENGTH) {
    throw new RangeError(`length 必须是 ${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} 之间的整数`)
  }
  if (!PASSWORD_GENERATOR_MODES.includes(options.mode)) {
    throw new TypeError('mode 不受支持')
  }

  const characterTypes = [...MODE_CHARACTER_TYPES[options.mode]]
  const pool = characterTypes.map(type => CHARACTER_SETS[type]).join('')
  const passwordCharacters = characterTypes.map(type => randomCharacter(CHARACTER_SETS[type]))

  while (passwordCharacters.length < options.length) {
    passwordCharacters.push(randomCharacter(pool))
  }
  secureShuffle(passwordCharacters)

  const entropy = Math.round(options.length * Math.log2(pool.length) * 100) / 100
  return {
    password: passwordCharacters.join(''),
    length: options.length,
    mode: options.mode,
    character_types: characterTypes,
    entropy,
    strength: passwordStrength(entropy),
    ambiguous_characters_excluded: true
  }
}

export function formatPasswordGeneratorText(result: PasswordGeneratorResult): string {
  return result.password
}

export function formatPasswordGeneratorMarkdown(result: PasswordGeneratorResult): string {
  return `# 随机密码

\`\`\`text
${result.password}
\`\`\`

- 长度：${result.length}
- 模式：${result.mode}
- 估算熵值：${result.entropy} bits
- 强度：${result.strength}`
}

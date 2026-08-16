export const PASSWORD_CHECK_ENCODINGS = ['json', 'text', 'markdown', 'md'] as const
export const PASSWORD_MAX_CODE_POINTS = 128

export type PasswordCheckEncoding = typeof PASSWORD_CHECK_ENCODINGS[number]
export type PasswordStrengthLevel = '极弱' | '弱' | '中等' | '强' | '极强'

export interface PasswordCharacterAnalysis {
  has_lowercase: boolean
  has_uppercase: boolean
  has_numbers: boolean
  has_symbols: boolean
  has_other_letters: boolean
  has_repeated: boolean
  has_sequential: boolean
  is_common_password: boolean
  character_variety: number
  unique_characters: number
}

export interface PasswordCheckResult {
  length: number
  score: number
  strength: PasswordStrengthLevel
  entropy: number
  time_to_crack: string
  character_analysis: PasswordCharacterAnalysis
  recommendations: string[]
  security_tips: string[]
}

export type PasswordCheckBodyResult
  = | { ok: true, password: string }
    | { ok: false, code: string, message: string }

interface PasswordSignals {
  codePoints: string[]
  hasLowercase: boolean
  hasUppercase: boolean
  hasNumbers: boolean
  hasSymbols: boolean
  hasOtherLetters: boolean
  hasRepeated: boolean
  hasSequential: boolean
  isCommonPassword: boolean
  characterVariety: number
  uniqueCharacters: number
  categoryCount: number
  uniqueRatio: number
}

const LOWERCASE_POOL_SIZE = 26
const UPPERCASE_POOL_SIZE = 26
const NUMBER_POOL_SIZE = 10
const SYMBOL_POOL_SIZE = 33
const OTHER_LETTER_POOL_SIZE = 100
const OFFLINE_GUESSES_PER_SECOND = 10_000_000_000

const COMMON_PASSWORDS = new Set([
  '1234',
  '12345',
  '123456',
  '1234567',
  '12345678',
  '123456789',
  '1234567890',
  '111111',
  '000000',
  '666666',
  '888888',
  '654321',
  '123123',
  '123321',
  'abc123',
  'abcdef',
  'abcdefgh',
  'admin',
  'admin123',
  'iloveyou',
  'letmein',
  'login',
  'master',
  'monkey',
  'passw0rd',
  'password',
  'password1',
  'password123',
  'qazwsx',
  'qwerty',
  'qwerty123',
  'qwertyuiop',
  'root',
  'superman',
  'welcome',
  'welcome123',
  'woaini',
  '密码',
  '我爱你'
])

const SEQUENCE_SOURCES = [
  'abcdefghijklmnopqrstuvwxyz',
  '0123456789',
  'qwertyuiop',
  'asdfghjkl',
  'zxcvbnm',
  '1qaz',
  '2wsx',
  '3edc',
  '4rfv',
  '5tgb',
  '6yhn',
  '7ujm'
] as const

const SECURITY_TIPS = [
  '不同站点使用不同的密码',
  '使用可信的密码管理器生成和保存长密码',
  '重要账户应同时启用多因素认证',
  '强度评分只是估算，不能代替密码泄露检查'
] as const

const LOWERCASE_RE = /\p{Ll}/u
const UPPERCASE_RE = /\p{Lu}/u
const NUMBER_RE = /\p{N}/u
const LETTER_RE = /\p{L}/u

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function countPasswordCodePoints(password: string): number {
  return Array.from(password).length
}

export function parsePasswordCheckBody(body: unknown): PasswordCheckBodyResult {
  if (!isRecord(body) || typeof body.password !== 'string') {
    return {
      ok: false,
      code: 'INVALID_REQUEST_BODY',
      message: '请求体必须包含字符串字段 password'
    }
  }

  const length = countPasswordCodePoints(body.password)
  if (length === 0) {
    return { ok: false, code: 'PASSWORD_REQUIRED', message: 'password 不能为空' }
  }
  if (length > PASSWORD_MAX_CODE_POINTS) {
    return {
      ok: false,
      code: 'PASSWORD_TOO_LONG',
      message: `password 不能超过 ${PASSWORD_MAX_CODE_POINTS} 个 Unicode 码点`
    }
  }

  return { ok: true, password: body.password }
}

function hasRepeatedCharacters(codePoints: string[]): boolean {
  return codePoints.some((character, index) => (
    index >= 2
    && character === codePoints[index - 1]
    && character === codePoints[index - 2]
  ))
}

function hasSequentialCharacters(password: string): boolean {
  const comparable = password.toLowerCase()
  return SEQUENCE_SOURCES.some((source) => {
    for (let index = 0; index <= source.length - 3; index += 1) {
      const sequence = source.slice(index, index + 3)
      const reversed = Array.from(sequence).reverse().join('')
      if (comparable.includes(sequence) || comparable.includes(reversed)) return true
    }
    return false
  })
}

function isCommonPassword(password: string): boolean {
  return COMMON_PASSWORDS.has(password.toLowerCase())
}

function analyzePassword(password: string): PasswordSignals {
  const codePoints = Array.from(password)
  const hasLowercase = codePoints.some(character => LOWERCASE_RE.test(character))
  const hasUppercase = codePoints.some(character => UPPERCASE_RE.test(character))
  const hasNumbers = codePoints.some(character => NUMBER_RE.test(character))
  const hasOtherLetters = codePoints.some(character => (
    LETTER_RE.test(character)
    && !LOWERCASE_RE.test(character)
    && !UPPERCASE_RE.test(character)
  ))
  const hasSymbols = codePoints.some(character => !LETTER_RE.test(character) && !NUMBER_RE.test(character))
  const hasRepeated = hasRepeatedCharacters(codePoints)
  const hasSequential = hasSequentialCharacters(password)
  const common = isCommonPassword(password)
  const uniqueCharacters = new Set(codePoints).size
  const categoryCount = [hasLowercase, hasUppercase, hasNumbers, hasSymbols, hasOtherLetters]
    .filter(Boolean).length
  const characterVariety = (
    (hasLowercase ? LOWERCASE_POOL_SIZE : 0)
    + (hasUppercase ? UPPERCASE_POOL_SIZE : 0)
    + (hasNumbers ? NUMBER_POOL_SIZE : 0)
    + (hasSymbols ? SYMBOL_POOL_SIZE : 0)
    + (hasOtherLetters ? OTHER_LETTER_POOL_SIZE : 0)
  )

  return {
    codePoints,
    hasLowercase,
    hasUppercase,
    hasNumbers,
    hasSymbols,
    hasOtherLetters,
    hasRepeated,
    hasSequential,
    isCommonPassword: common,
    characterVariety,
    uniqueCharacters,
    categoryCount,
    uniqueRatio: uniqueCharacters / codePoints.length
  }
}

function calculateScore(signals: PasswordSignals): number {
  const length = signals.codePoints.length
  let score = Math.min(length, 20) * 3
  score += Math.max(0, Math.min(signals.categoryCount, 4) - 1) * 8

  if (length >= 12) score += 6
  if (length >= 16) score += 6
  if (signals.uniqueRatio >= 0.7) score += 4
  if (signals.categoryCount === 1) score -= 8
  if (signals.hasRepeated) score -= 15
  if (signals.hasSequential) score -= 15
  if (signals.isCommonPassword) score -= 40
  if (signals.uniqueRatio < 0.35) score -= 10

  return Math.max(0, Math.min(100, Math.round(score)))
}

function estimateEntropy(signals: PasswordSignals): number {
  let entropy = signals.codePoints.length * Math.log2(Math.max(signals.characterVariety, 1))

  if (signals.hasRepeated) entropy *= 0.72
  if (signals.hasSequential) entropy *= 0.72
  if (signals.uniqueRatio < 0.5) entropy *= 0.75
  if (signals.isCommonPassword) entropy = Math.min(entropy, 10)

  return Math.round(Math.max(0, entropy) * 100) / 100
}

function strengthFromScore(score: number): PasswordStrengthLevel {
  if (score < 30) return '极弱'
  if (score < 50) return '弱'
  if (score < 70) return '中等'
  if (score < 85) return '强'
  return '极强'
}

function formatAmount(value: number): string {
  if (value < 10) return value.toFixed(1).replace(/\.0$/, '')
  return Math.round(value).toLocaleString('zh-CN')
}

function estimateTimeToCrack(entropy: number): string {
  const averageGuesses = 2 ** Math.max(entropy - 1, 0)
  const seconds = averageGuesses / OFFLINE_GUESSES_PER_SECOND
  if (seconds < 1) return '估算少于 1 秒'
  if (seconds < 60) return `估算约 ${formatAmount(seconds)} 秒`
  if (seconds < 3_600) return `估算约 ${formatAmount(seconds / 60)} 分钟`
  if (seconds < 86_400) return `估算约 ${formatAmount(seconds / 3_600)} 小时`
  if (seconds < 31_536_000) return `估算约 ${formatAmount(seconds / 86_400)} 天`

  const years = seconds / 31_536_000
  if (years >= 1_000_000) return '估算超过 100 万年'
  return `估算约 ${formatAmount(years)} 年`
}

function buildRecommendations(signals: PasswordSignals, score: number): string[] {
  const recommendations: string[] = []
  const length = signals.codePoints.length

  if (signals.isCommonPassword) recommendations.push('不要使用已知的常见密码')
  if (length < 12) recommendations.push('建议将密码长度增加到至少 12 个字符')
  else if (length < 16) recommendations.push('重要账户建议使用至少 16 个字符')
  if (signals.categoryCount < 3) recommendations.push('混合使用字母、数字或符号中的多种类型')
  if (signals.hasRepeated) recommendations.push('避免连续使用三个或更多相同字符')
  if (signals.hasSequential) recommendations.push('避免使用 abc、123 或 qwerty 类连续序列')
  if (signals.uniqueRatio < 0.5) recommendations.push('增加不同字符的数量，减少重复模式')
  if (recommendations.length === 0 && score >= 70) {
    recommendations.push('当前强度较好，仍请确保未在其他站点重复使用')
  }

  return recommendations
}

export function checkPasswordStrength(password: string): PasswordCheckResult {
  const parsed = parsePasswordCheckBody({ password })
  if (!parsed.ok) throw new RangeError(parsed.message)

  const signals = analyzePassword(parsed.password)
  const score = calculateScore(signals)
  const entropy = estimateEntropy(signals)

  return {
    length: signals.codePoints.length,
    score,
    strength: strengthFromScore(score),
    entropy,
    time_to_crack: estimateTimeToCrack(entropy),
    character_analysis: {
      has_lowercase: signals.hasLowercase,
      has_uppercase: signals.hasUppercase,
      has_numbers: signals.hasNumbers,
      has_symbols: signals.hasSymbols,
      has_other_letters: signals.hasOtherLetters,
      has_repeated: signals.hasRepeated,
      has_sequential: signals.hasSequential,
      is_common_password: signals.isCommonPassword,
      character_variety: signals.characterVariety,
      unique_characters: signals.uniqueCharacters
    },
    recommendations: buildRecommendations(signals, score),
    security_tips: [...SECURITY_TIPS]
  }
}

export function isPasswordCheckEncoding(value: string): value is PasswordCheckEncoding {
  return PASSWORD_CHECK_ENCODINGS.includes(value as PasswordCheckEncoding)
}

function yesNo(value: boolean): string {
  return value ? '是' : '否'
}

export function formatPasswordCheckText(result: PasswordCheckResult): string {
  const recommendations = result.recommendations.map(item => `- ${item}`).join('\n')
  const tips = result.security_tips.map(item => `- ${item}`).join('\n')

  return `密码强度检测

评分：${result.score}/100
强度：${result.strength}
长度：${result.length} 个 Unicode 码点
估算熵值：${result.entropy} bits
破解时间：${result.time_to_crack}

字符分析：
- 小写字母：${yesNo(result.character_analysis.has_lowercase)}
- 大写字母：${yesNo(result.character_analysis.has_uppercase)}
- 数字：${yesNo(result.character_analysis.has_numbers)}
- 符号：${yesNo(result.character_analysis.has_symbols)}
- 其他文字：${yesNo(result.character_analysis.has_other_letters)}
- 连续重复：${yesNo(result.character_analysis.has_repeated)}
- 连续序列：${yesNo(result.character_analysis.has_sequential)}
- 常见密码：${yesNo(result.character_analysis.is_common_password)}

改进建议：
${recommendations}

安全提示：
${tips}`
}

export function formatPasswordCheckMarkdown(result: PasswordCheckResult): string {
  const recommendations = result.recommendations.map(item => `- ${item}`).join('\n')
  const tips = result.security_tips.map(item => `- ${item}`).join('\n')

  return `# 密码强度检测

| 指标 | 结果 |
| --- | --- |
| 评分 | ${result.score}/100 |
| 强度 | ${result.strength} |
| 长度 | ${result.length} 个 Unicode 码点 |
| 估算熵值 | ${result.entropy} bits |
| 破解时间 | ${result.time_to_crack} |

## 字符分析

| 类型 | 状态 |
| --- | --- |
| 小写字母 | ${yesNo(result.character_analysis.has_lowercase)} |
| 大写字母 | ${yesNo(result.character_analysis.has_uppercase)} |
| 数字 | ${yesNo(result.character_analysis.has_numbers)} |
| 符号 | ${yesNo(result.character_analysis.has_symbols)} |
| 其他文字 | ${yesNo(result.character_analysis.has_other_letters)} |
| 连续重复 | ${yesNo(result.character_analysis.has_repeated)} |
| 连续序列 | ${yesNo(result.character_analysis.has_sequential)} |
| 常见密码 | ${yesNo(result.character_analysis.is_common_password)} |

## 改进建议

${recommendations}

## 安全提示

${tips}`
}

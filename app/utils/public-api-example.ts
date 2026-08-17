export const PUBLIC_API_EXAMPLE_TIMESTAMP = 1_785_542_400_000

export function formatStandardResponseExample(
  message: string,
  timestamp = PUBLIC_API_EXAMPLE_TIMESTAMP
): string {
  return [
    '{',
    '  "code": "OK",',
    `  "message": ${JSON.stringify(message)},`,
    '  "data": null,',
    `  "timestamp": ${timestamp}`,
    '}'
  ].join('\n')
}

export function formatYiyanResponseExample(
  message: string,
  timestamp = PUBLIC_API_EXAMPLE_TIMESTAMP
): string {
  return [
    '{',
    '  "code": "OK",',
    `  "message": ${JSON.stringify(message)},`,
    '  "data": {',
    '    "id": "a1",',
    '    "yiyan": "与众不同的生活方式很累人呢，因为找不到借口。",',
    '    "type": "a",',
    '    "from": "幸运星",',
    '    "from_who": null,',
    '    "created_at": "1468605909",',
    '    "length": 22',
    '  },',
    `  "timestamp": ${timestamp}`,
    '}'
  ].join('\n')
}

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

export function formatExchangeRateResponseExample(
  message: string,
  timestamp = PUBLIC_API_EXAMPLE_TIMESTAMP
): string {
  return [
    '{',
    '  "code": "OK",',
    `  "message": ${JSON.stringify(message)},`,
    '  "data": {',
    '    "base_code": "CNY",',
    '    "rates": [',
    '      { "currency": "USD", "rate": 0.1392 },',
    '      { "currency": "JPY", "rate": 20.61 }',
    '    ]',
    '  },',
    `  "timestamp": ${timestamp}`,
    '}'
  ].join('\n')
}

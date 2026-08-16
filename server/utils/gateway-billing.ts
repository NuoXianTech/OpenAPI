export function shouldChargeGatewayCall(input: {
  costCredits: number
  apiKeyUserId: number | null
  statusCode: number
}): boolean {
  return input.costCredits > 0
    && input.apiKeyUserId !== null
    && input.statusCode >= 200
    && input.statusCode < 400
}

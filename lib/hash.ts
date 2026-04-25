import { createHash } from 'crypto'

export function dedupHash(
  businessId: string,
  date: string,
  amount: number,
  description: string
): string {
  return createHash('sha256')
    .update(`${businessId}|${date}|${amount}|${description}`)
    .digest('hex')
}

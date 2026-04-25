import { categorizeWithFallback } from './providers'
import type { Category } from '@/lib/types'

type TransactionInput = {
  index: number
  date: string
  description: string
  amount: number
}

export async function categorizeTransactions(
  transactions: TransactionInput[],
  categories: Category[]
): Promise<Map<number, string>> {
  return categorizeWithFallback(transactions, categories)
}

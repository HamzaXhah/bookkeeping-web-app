export type Business = {
  id: string
  name: string
  createdAt: number
}

export type Category = {
  id: string
  businessId: string
  name: string
  kind: 'income' | 'expense'
}

export type Transaction = {
  id: string
  businessId: string
  date: string
  description: string
  amount: number
  categoryId: string | null
  categoryName?: string | null
  categorizedBy: 'ai' | 'memory' | 'manual' | null
  sourceFile: string | null
  createdAt: number
}

export type PnLReport = {
  range: { from: string; to: string }
  income: { category: string; total: number }[]
  expenses: { category: string; total: number }[]
  totals: { income: number; expenses: number; net: number }
}

export type ImportResult = {
  imported: number
  skippedDuplicates: number
  aiCategorized: number
  memoryCategorized: number
}

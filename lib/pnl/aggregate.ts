import { db } from '@/lib/db/client'
import { transactions, categories } from '@/lib/db/schema'
import { eq, and, gte, lte, sql } from 'drizzle-orm'
import type { PnLReport } from '@/lib/types'

export async function aggregatePnL(
  businessId: string,
  from: string,
  to: string
): Promise<PnLReport> {
  const rows = await db
    .select({
      categoryName: categories.name,
      kind: categories.kind,
      total: sql<number>`sum(${transactions.amount})`,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.businessId, businessId),
        gte(transactions.date, from),
        lte(transactions.date, to)
      )
    )
    .groupBy(categories.name, categories.kind)

  const income: { category: string; total: number }[] = []
  const expenses: { category: string; total: number }[] = []

  for (const row of rows) {
    const total = Number(row.total)
    if (row.kind === 'income' || total > 0) {
      income.push({ category: row.categoryName ?? 'Uncategorized', total: Math.abs(total) })
    } else {
      expenses.push({ category: row.categoryName ?? 'Uncategorized', total: Math.abs(total) })
    }
  }

  const totalIncome = income.reduce((s, r) => s + r.total, 0)
  const totalExpenses = expenses.reduce((s, r) => s + r.total, 0)

  return {
    range: { from, to },
    income,
    expenses,
    totals: { income: totalIncome, expenses: totalExpenses, net: totalIncome - totalExpenses },
  }
}

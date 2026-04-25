import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { transactions, categories } from '@/lib/db/schema'
import { eq, and, gte, lte, desc } from 'drizzle-orm'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get('businessId')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const categoryId = searchParams.get('categoryId')

  if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })

  const conditions = [eq(transactions.businessId, businessId)]
  if (from) conditions.push(gte(transactions.date, from))
  if (to) conditions.push(lte(transactions.date, to))
  if (categoryId) conditions.push(eq(transactions.categoryId, categoryId))

  const rows = await db
    .select({
      id: transactions.id,
      businessId: transactions.businessId,
      date: transactions.date,
      description: transactions.description,
      amount: transactions.amount,
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      categorizedBy: transactions.categorizedBy,
      sourceFile: transactions.sourceFile,
      createdAt: transactions.createdAt,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(...conditions))
    .orderBy(desc(transactions.date), desc(transactions.createdAt))

  return NextResponse.json(rows)
}

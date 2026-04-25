import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { transactions, categories } from '@/lib/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { categorizeTransactions } from '@/lib/ai/categorize'

export async function POST(req: Request) {
  const { businessId, transactionIds } = await req.json()
  if (!businessId || !Array.isArray(transactionIds) || transactionIds.length === 0) {
    return NextResponse.json({ error: 'businessId and transactionIds required' }, { status: 400 })
  }

  const txRows = await db
    .select()
    .from(transactions)
    .where(inArray(transactions.id, transactionIds))

  if (txRows.length === 0) return NextResponse.json({ updated: 0 })

  const cats = await db.select().from(categories).where(eq(categories.businessId, businessId))
  const catByName = new Map(cats.map((c) => [c.name, c]))

  const inputs = txRows.map((t, i) => ({
    index: i,
    date: t.date,
    description: t.description,
    amount: t.amount,
  }))

  const aiResult = await categorizeTransactions(inputs, cats)

  for (const [i, catName] of aiResult.entries()) {
    const cat = catByName.get(catName)
    await db
      .update(transactions)
      .set({ categoryId: cat?.id ?? null, categorizedBy: 'ai' })
      .where(eq(transactions.id, txRows[i].id))
  }

  return NextResponse.json({ updated: aiResult.size })
}

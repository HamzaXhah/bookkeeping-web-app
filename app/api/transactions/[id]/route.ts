import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { transactions, categories, merchantMemory } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { normalizeDesc } from '@/lib/memory/match'
import { createId } from '@paralleldrive/cuid2'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { categoryId } = await req.json()

  const txRows = await db.select().from(transactions).where(eq(transactions.id, id))
  if (!txRows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const tx = txRows[0]

  // Update transaction category and upsert merchant memory in one operation
  await db.update(transactions).set({ categoryId: categoryId ?? null }).where(eq(transactions.id, id))

  if (categoryId) {
    const catRows = await db.select().from(categories).where(eq(categories.id, categoryId))
    if (catRows.length) {
      const normalized = normalizeDesc(tx.description)
      const existing = await db
        .select()
        .from(merchantMemory)
        .where(eq(merchantMemory.businessId, tx.businessId))

      const match = existing.find((e) => e.normalizedDesc === normalized)
      if (match) {
        await db
          .update(merchantMemory)
          .set({ categoryId, updatedAt: Date.now() })
          .where(eq(merchantMemory.id, match.id))
      } else {
        await db.insert(merchantMemory).values({
          id: createId(),
          businessId: tx.businessId,
          normalizedDesc: normalized,
          categoryId,
          updatedAt: Date.now(),
        })
      }
    }
  }

  return NextResponse.json({ ok: true })
}

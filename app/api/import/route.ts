import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { transactions, categories, merchantMemory } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { parseCSV } from '@/lib/csv/parse'
import { dedupHash } from '@/lib/hash'
import { normalizeDesc, findMemoryMatch } from '@/lib/memory/match'
import { categorizeTransactions } from '@/lib/ai/categorize'
import { createId } from '@paralleldrive/cuid2'

export async function POST(req: Request) {
  const form = await req.formData()
  const file = form.get('file') as File | null
  const businessId = form.get('businessId') as string | null

  if (!file || !businessId) {
    return NextResponse.json({ error: 'file and businessId required' }, { status: 400 })
  }

  const csvText = await file.text()
  let parsed
  try {
    parsed = parseCSV(csvText)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 })
  }

  if (parsed.length === 0) {
    return NextResponse.json({ error: 'No valid rows found in CSV' }, { status: 400 })
  }

  // ── Dedup ────────────────────────────────────────────────────────────────────
  const hashes = parsed.map((r) => dedupHash(businessId, r.date, r.amount, r.description))
  const existingTx = await db
    .select({ dedupHash: transactions.dedupHash })
    .from(transactions)
    .where(eq(transactions.businessId, businessId))
  const existingHashes = new Set(existingTx.map((t) => t.dedupHash))

  const newRows = parsed
    .map((r, i) => ({ ...r, hash: hashes[i] }))
    .filter((r) => !existingHashes.has(r.hash))

  const skippedDuplicates = parsed.length - newRows.length

  if (newRows.length === 0) {
    return NextResponse.json({
      imported: 0,
      skippedDuplicates,
      aiCategorized: 0,
      memoryCategorized: 0,
      needsReview: 0,
    })
  }

  // ── Load categories and memory ───────────────────────────────────────────────
  const cats = await db.select().from(categories).where(eq(categories.businessId, businessId))
  const catByName = new Map(cats.map((c) => [c.name, c]))

  const memory = await db
    .select()
    .from(merchantMemory)
    .where(eq(merchantMemory.businessId, businessId))

  // ── Memory match ─────────────────────────────────────────────────────────────
  type RowResolution = { categoryId: string | null; categorizedBy: 'ai' | 'memory' | null }
  const toAI: { index: number; date: string; description: string; amount: number }[] = []
  const resolved = new Map<number, RowResolution>()
  let memoryCategorized = 0

  for (let i = 0; i < newRows.length; i++) {
    const normalized = normalizeDesc(newRows[i].description)
    const memCatId = findMemoryMatch(normalized, memory)
    if (memCatId) {
      resolved.set(i, { categoryId: memCatId, categorizedBy: 'memory' })
      memoryCategorized++
    } else {
      toAI.push({ index: i, ...newRows[i] })
    }
  }

  // ── AI batch ─────────────────────────────────────────────────────────────────
  let aiCategorized = 0
  if (toAI.length > 0) {
    const aiResult = await categorizeTransactions(toAI, cats)
    for (const [idx, catName] of aiResult.entries()) {
      const cat = catByName.get(catName)
      if (cat) {
        // AI returned a category we recognize → real assignment
        resolved.set(idx, { categoryId: cat.id, categorizedBy: 'ai' })
        aiCategorized++
      }
      // else: AI returned "Uncategorized" or an unknown name → leave unresolved
    }
  }

  // ── Insert ───────────────────────────────────────────────────────────────────
  const now = Date.now()
  let needsReview = 0
  const toInsert = newRows.map((row, i) => {
    const res = resolved.get(i)
    if (!res) needsReview++
    return {
      id: createId(),
      businessId,
      date: row.date,
      description: row.description,
      amount: row.amount,
      categoryId: res?.categoryId ?? null,
      categorizedBy: res?.categorizedBy ?? null,
      dedupHash: row.hash,
      sourceFile: file.name,
      createdAt: now,
    }
  })

  await db.insert(transactions).values(toInsert)

  return NextResponse.json({
    imported: toInsert.length,
    skippedDuplicates,
    aiCategorized,
    memoryCategorized,
    needsReview,
  })
}

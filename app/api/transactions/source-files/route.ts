import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { transactions, merchantMemory } from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { normalizeDesc } from '@/lib/memory/match'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get('businessId')
  if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })

  const rows = await db
    .select({
      sourceFile: transactions.sourceFile,
      count: sql<number>`count(*)`,
    })
    .from(transactions)
    .where(eq(transactions.businessId, businessId))
    .groupBy(transactions.sourceFile)
    .orderBy(transactions.sourceFile)

  return NextResponse.json(
    rows.map((r) => ({ sourceFile: r.sourceFile, count: Number(r.count) }))
  )
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get('businessId')
  if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })

  const body = await req.json()
  const sourceFiles: (string | null)[] = body.sourceFiles

  if (!Array.isArray(sourceFiles) || sourceFiles.length === 0) {
    return NextResponse.json({ error: 'sourceFiles array required' }, { status: 400 })
  }

  const nullIncluded = sourceFiles.includes(null)
  const fileNames = sourceFiles.filter((f): f is string => f !== null)

  // ── Step 1: Fetch the descriptions of all transactions being deleted ─────────
  // We need these to know which merchant memory entries to clear.
  let doomed: { description: string }[] = []

  if (fileNames.length > 0) {
    const rows = await db
      .select({ description: transactions.description })
      .from(transactions)
      .where(
        sql`${transactions.businessId} = ${businessId} AND ${transactions.sourceFile} IN (${sql.join(fileNames.map((f) => sql`${f}`), sql`, `)})`
      )
    doomed = doomed.concat(rows)
  }

  if (nullIncluded) {
    const rows = await db
      .select({ description: transactions.description })
      .from(transactions)
      .where(
        sql`${transactions.businessId} = ${businessId} AND ${transactions.sourceFile} IS NULL`
      )
    doomed = doomed.concat(rows)
  }

  // ── Step 2: Collect unique normalized descriptions ────────────────────────────
  const normalizedSet = new Set(doomed.map((r) => normalizeDesc(r.description)))

  // ── Step 3: Delete matching merchant memory entries ───────────────────────────
  // Only wipe memory for descriptions that come EXCLUSIVELY from the files being
  // deleted — if the same merchant exists in a file we're keeping, leave it alone.
  let memoryCleared = 0

  if (normalizedSet.size > 0) {
    // Find which normalized descs still have surviving transactions after deletion
    const allTxForBusiness = await db
      .select({ description: transactions.description, sourceFile: transactions.sourceFile })
      .from(transactions)
      .where(eq(transactions.businessId, businessId))

    const survivingNormalized = new Set<string>()
    for (const tx of allTxForBusiness) {
      const isBeingDeleted =
        (tx.sourceFile !== null && fileNames.includes(tx.sourceFile)) ||
        (tx.sourceFile === null && nullIncluded)
      if (!isBeingDeleted) {
        survivingNormalized.add(normalizeDesc(tx.description))
      }
    }

    // Only clear memory for merchants that have NO surviving transactions
    const toWipe = [...normalizedSet].filter((n) => !survivingNormalized.has(n))

    for (const normalized of toWipe) {
      const res = await db
        .delete(merchantMemory)
        .where(
          and(
            eq(merchantMemory.businessId, businessId),
            eq(merchantMemory.normalizedDesc, normalized)
          )
        )
      memoryCleared += (res as unknown as { changes: number }).changes ?? 0
    }
  }

  // ── Step 4: Delete the transactions ──────────────────────────────────────────
  let deleted = 0

  if (fileNames.length > 0) {
    const res = await db
      .delete(transactions)
      .where(
        sql`${transactions.businessId} = ${businessId} AND ${transactions.sourceFile} IN (${sql.join(fileNames.map((f) => sql`${f}`), sql`, `)})`
      )
    deleted += (res as unknown as { changes: number }).changes ?? 0
  }

  if (nullIncluded) {
    const res = await db
      .delete(transactions)
      .where(
        sql`${transactions.businessId} = ${businessId} AND ${transactions.sourceFile} IS NULL`
      )
    deleted += (res as unknown as { changes: number }).changes ?? 0
  }

  return NextResponse.json({ deleted, memoryCleared })
}

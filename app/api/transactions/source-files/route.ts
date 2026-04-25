import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { transactions } from '@/lib/db/schema'
import { eq, inArray, isNotNull, sql } from 'drizzle-orm'

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

  // Include a synthetic "(no file)" group for transactions imported without a filename
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

  // Split nulls and real filenames
  const nullIncluded = sourceFiles.includes(null)
  const fileNames = sourceFiles.filter((f): f is string => f !== null)

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
      .where(sql`${transactions.businessId} = ${businessId} AND ${transactions.sourceFile} IS NULL`)
    deleted += (res as unknown as { changes: number }).changes ?? 0
  }

  return NextResponse.json({ deleted })
}

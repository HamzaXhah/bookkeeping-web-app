import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { merchantMemory, categories } from '@/lib/db/schema'
import { eq, and, inArray, desc } from 'drizzle-orm'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get('businessId')
  if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })

  const rows = await db
    .select({
      id: merchantMemory.id,
      normalizedDesc: merchantMemory.normalizedDesc,
      categoryId: merchantMemory.categoryId,
      categoryName: categories.name,
      categoryKind: categories.kind,
      updatedAt: merchantMemory.updatedAt,
    })
    .from(merchantMemory)
    .leftJoin(categories, eq(merchantMemory.categoryId, categories.id))
    .where(eq(merchantMemory.businessId, businessId))
    .orderBy(desc(merchantMemory.updatedAt))

  return NextResponse.json(rows)
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get('businessId')
  if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })

  const body = await req.json()
  const all: boolean = body.all === true
  const ids: string[] = Array.isArray(body.ids) ? body.ids : []

  if (!all && ids.length === 0) {
    return NextResponse.json({ error: 'Provide ids[] or all:true' }, { status: 400 })
  }

  let cleared = 0

  if (all) {
    const res = await db.delete(merchantMemory).where(eq(merchantMemory.businessId, businessId))
    cleared = (res as unknown as { changes: number }).changes ?? 0
  } else {
    const res = await db
      .delete(merchantMemory)
      .where(and(eq(merchantMemory.businessId, businessId), inArray(merchantMemory.id, ids)))
    cleared = (res as unknown as { changes: number }).changes ?? 0
  }

  return NextResponse.json({ cleared })
}

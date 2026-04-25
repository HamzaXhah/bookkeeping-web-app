import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { categories } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get('businessId')
  if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })
  const rows = await db.select().from(categories).where(eq(categories.businessId, businessId))
  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  const { businessId, name, kind } = await req.json()
  if (!businessId || !name?.trim() || !['income', 'expense'].includes(kind)) {
    return NextResponse.json({ error: 'businessId, name and kind required' }, { status: 400 })
  }
  const row = { id: createId(), businessId, name: name.trim(), kind }
  await db.insert(categories).values(row)
  return NextResponse.json(row, { status: 201 })
}

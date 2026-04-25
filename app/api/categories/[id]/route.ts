import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { categories } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { name, kind } = await req.json()
  const updates: Partial<{ name: string; kind: 'income' | 'expense' }> = {}
  if (name?.trim()) updates.name = name.trim()
  if (kind && ['income', 'expense'].includes(kind)) updates.kind = kind
  if (!Object.keys(updates).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  await db.update(categories).set(updates).where(eq(categories.id, id))
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.delete(categories).where(eq(categories.id, id))
  return NextResponse.json({ ok: true })
}

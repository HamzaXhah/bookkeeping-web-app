import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { businesses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const rows = await db.select().from(businesses).where(eq(businesses.id, id))
  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(rows[0])
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })
  await db.update(businesses).set({ name: name.trim() }).where(eq(businesses.id, id))
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.delete(businesses).where(eq(businesses.id, id))
  return NextResponse.json({ ok: true })
}

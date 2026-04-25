import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { businesses } from '@/lib/db/schema'
import { seedCategories } from '@/lib/db/seed-categories'
import { runMigrations } from '@/lib/db/migrate'
import { createId } from '@paralleldrive/cuid2'
import { desc } from 'drizzle-orm'

runMigrations()

export async function GET() {
  const rows = await db.select().from(businesses).orderBy(desc(businesses.createdAt))
  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  const { name } = await req.json()
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }
  const id = createId()
  const now = Date.now()
  await db.insert(businesses).values({ id, name: name.trim(), createdAt: now })
  await seedCategories(id)
  return NextResponse.json({ id, name: name.trim(), createdAt: now }, { status: 201 })
}

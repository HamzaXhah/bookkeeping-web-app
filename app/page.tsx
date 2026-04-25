import { redirect } from 'next/navigation'
import { db } from '@/lib/db/client'
import { businesses } from '@/lib/db/schema'
import { desc } from 'drizzle-orm'
import { runMigrations } from '@/lib/db/migrate'
import { CreateBusinessForm } from './create-business-form'

runMigrations()

export default async function RootPage() {
  const all = await db.select().from(businesses).orderBy(desc(businesses.createdAt))

  if (all.length === 1) {
    redirect(`/business/${all[0].id}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md space-y-6 p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Bookkeeping</h1>
          <p className="text-slate-500 mt-1 text-sm">Simple P&amp;L for your businesses</p>
        </div>

        {all.length > 1 && (
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-slate-700">Your businesses</h2>
            {all.map((b) => (
              <a
                key={b.id}
                href={`/business/${b.id}`}
                className="block p-3 rounded-lg border bg-white hover:bg-slate-50 text-slate-800 font-medium transition-colors"
              >
                {b.name}
              </a>
            ))}
          </div>
        )}

        <CreateBusinessForm />
      </div>
    </div>
  )
}

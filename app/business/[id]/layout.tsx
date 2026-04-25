import Link from 'next/link'
import { db } from '@/lib/db/client'
import { businesses } from '@/lib/db/schema'
import { desc } from 'drizzle-orm'
import { BusinessSwitcher } from '@/components/business-switcher'
import { runMigrations } from '@/lib/db/migrate'

runMigrations()

const navLinks = (id: string) => [
  { href: `/business/${id}`, label: 'Dashboard' },
  { href: `/business/${id}/transactions`, label: 'Transactions' },
  { href: `/business/${id}/import`, label: 'Import' },
  { href: `/business/${id}/pnl`, label: 'P&L' },
  { href: `/business/${id}/categories`, label: 'Categories' },
  { href: `/business/${id}/memory`, label: 'Memory' },
]

export default async function BusinessLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const allBusinesses = await db.select().from(businesses).orderBy(desc(businesses.createdAt))

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="font-semibold text-slate-800 shrink-0">
              Bookkeeping
            </Link>
            <BusinessSwitcher businesses={allBusinesses} currentId={id} />
          </div>
          <nav className="flex items-center gap-1">
            {navLinks(id).map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="px-3 py-1.5 rounded text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">{children}</main>
    </div>
  )
}

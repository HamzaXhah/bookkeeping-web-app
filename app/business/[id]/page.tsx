import { db } from '@/lib/db/client'
import { transactions, categories, businesses } from '@/lib/db/schema'
import { eq, desc, and, gte } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AmountCell } from '@/components/amount-cell'

function startOfMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

export default async function DashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const bizRows = await db.select().from(businesses).where(eq(businesses.id, id))
  if (!bizRows.length) notFound()

  const monthStart = startOfMonth()

  const [allTx, recentTx] = await Promise.all([
    db
      .select({ amount: transactions.amount, categoryId: transactions.categoryId })
      .from(transactions)
      .where(and(eq(transactions.businessId, id), gte(transactions.date, monthStart))),
    db
      .select({
        id: transactions.id,
        date: transactions.date,
        description: transactions.description,
        amount: transactions.amount,
        categoryName: categories.name,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(eq(transactions.businessId, id))
      .orderBy(desc(transactions.date), desc(transactions.createdAt))
      .limit(10),
  ])

  const totalIncome = allTx.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const totalExpenses = allTx.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
  const net = totalIncome - totalExpenses

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{bizRows[0].name}</h1>
        <p className="text-slate-500 text-sm mt-0.5">Month-to-date summary</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Income</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{fmt(totalIncome)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{fmt(totalExpenses)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Net Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {fmt(net)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <Link
          href={`/business/${id}/import`}
          className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 transition-colors"
        >
          Import CSV
        </Link>
        <Link
          href={`/business/${id}/transactions`}
          className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          View Transactions
        </Link>
        <Link
          href={`/business/${id}/pnl`}
          className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          P&amp;L Report
        </Link>
      </div>

      {recentTx.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Recent transactions</h2>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-slate-600">Date</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-600">Description</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-600">Category</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-600">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentTx.map((t, i) => (
                  <tr key={t.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-4 py-2 text-slate-500">{t.date}</td>
                    <td className="px-4 py-2 max-w-xs truncate">{t.description}</td>
                    <td className="px-4 py-2 text-slate-500">{t.categoryName ?? 'Uncategorized'}</td>
                    <td className="px-4 py-2 text-right">
                      <AmountCell amount={t.amount} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

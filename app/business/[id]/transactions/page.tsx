'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { AmountCell } from '@/components/amount-cell'
import { CategorySelect } from '@/components/category-select'
import { DateRangePicker, type DateRange } from '@/components/date-range-picker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import type { Category, Transaction } from '@/lib/types'

const PAGE_SIZE = 50

function startOfMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function TransactionsPage() {
  const { id } = useParams<{ id: string }>()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [dateRange, setDateRange] = useState<DateRange>({ from: startOfMonth(), to: today() })
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [recategorizing, setRecategorizing] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [txRes, catRes] = await Promise.all([
      fetch(`/api/transactions?businessId=${id}&from=${dateRange.from}&to=${dateRange.to}`),
      fetch(`/api/categories?businessId=${id}`),
    ])
    const [txData, catData] = await Promise.all([txRes.json(), catRes.json()])
    setTransactions(txData)
    setCategories(catData)
    setLoading(false)
  }, [id, dateRange])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = transactions.filter((t) =>
    t.description.toLowerCase().includes(search.toLowerCase())
  )
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  async function handleCategoryChange(txId: string, categoryId: string) {
    const catId = categoryId === '__none__' ? null : categoryId
    const res = await fetch(`/api/transactions/${txId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId: catId }),
    })
    if (res.ok) {
      toast.success('Category updated')
      setTransactions((prev) =>
        prev.map((t) => (t.id === txId ? { ...t, categoryId: catId } : t))
      )
    }
  }

  async function handleRecategorize() {
    if (!selected.size) return
    setRecategorizing(true)
    const res = await fetch('/api/categorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId: id, transactionIds: [...selected] }),
    })
    const data = await res.json()
    setRecategorizing(false)
    if (res.ok) {
      toast.success(`Re-categorized ${data.updated} transactions`)
      setSelected(new Set())
      fetchData()
    }
  }

  function toggleSelect(txId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(txId)) next.delete(txId)
      else next.add(txId)
      return next
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Transactions</h1>
        {selected.size > 0 && (
          <Button size="sm" onClick={handleRecategorize} disabled={recategorizing}>
            {recategorizing ? 'Re-categorizing…' : `Re-categorize ${selected.size} with AI`}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <DateRangePicker value={dateRange} onChange={(r) => { setDateRange(r); setPage(0) }} />
        <Input
          placeholder="Search description…"
          className="h-8 w-56 text-sm"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0) }}
        />
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Loading…</p>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="w-8 px-3 py-2" />
                  <th className="text-left px-4 py-2 font-medium text-slate-600">Date</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-600">Description</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-600">Category</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-600">Amount</th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      No transactions found
                    </td>
                  </tr>
                )}
                {paged.map((t, i) => (
                  <tr key={t.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-3 py-1.5">
                      <input
                        type="checkbox"
                        checked={selected.has(t.id)}
                        onChange={() => toggleSelect(t.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-1.5 text-slate-500 whitespace-nowrap">{t.date}</td>
                    <td className="px-4 py-1.5 max-w-xs truncate">{t.description}</td>
                    <td className="px-4 py-1.5">
                      <CategorySelect
                        categories={categories}
                        value={t.categoryId}
                        onChange={(catId) => handleCategoryChange(t.id, catId)}
                      />
                    </td>
                    <td className="px-4 py-1.5 text-right">
                      <AmountCell amount={t.amount} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-2 justify-end text-sm">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                Previous
              </Button>
              <span className="text-slate-500">
                Page {page + 1} of {totalPages}
              </span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

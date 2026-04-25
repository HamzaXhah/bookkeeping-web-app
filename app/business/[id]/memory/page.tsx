'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { toast } from 'sonner'

type MemoryRow = {
  id: string
  normalizedDesc: string
  categoryId: string | null
  categoryName: string | null
  categoryKind: 'income' | 'expense' | null
  updatedAt: number
}

function formatDate(ms: number) {
  const d = new Date(ms)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function MemoryPage() {
  const { id } = useParams<{ id: string }>()
  const [rows, setRows] = useState<MemoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmDeleteSelected, setConfirmDeleteSelected] = useState(false)
  const [confirmClearAll, setConfirmClearAll] = useState(false)

  const fetchMemory = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/memory?businessId=${id}`)
    const data = await res.json()
    setRows(data)
    setLoading(false)
  }, [id])

  useEffect(() => { fetchMemory() }, [fetchMemory])

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase()
    if (!q) return true
    return (
      r.normalizedDesc.toLowerCase().includes(q) ||
      (r.categoryName ?? '').toLowerCase().includes(q)
    )
  })

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((r) => selected.has(r.id))

  function toggleOne(rowId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(rowId)) next.delete(rowId)
      else next.add(rowId)
      return next
    })
  }

  function toggleAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allFilteredSelected) {
        for (const r of filtered) next.delete(r.id)
      } else {
        for (const r of filtered) next.add(r.id)
      }
      return next
    })
  }

  async function handleDeleteSelected() {
    const res = await fetch(`/api/memory?businessId=${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [...selected] }),
    })
    const data = await res.json()
    if (res.ok) {
      toast.success(`Cleared ${data.cleared} memory entr${data.cleared === 1 ? 'y' : 'ies'}`)
      setSelected(new Set())
      setConfirmDeleteSelected(false)
      fetchMemory()
    }
  }

  async function handleClearAll() {
    const res = await fetch(`/api/memory?businessId=${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    })
    const data = await res.json()
    if (res.ok) {
      toast.success(`Cleared all ${data.cleared} memory entries`)
      setSelected(new Set())
      setConfirmClearAll(false)
      fetchMemory()
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Merchant Memory</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Learned merchant → category mappings. Future imports use these to skip the AI call.
          </p>
        </div>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmDeleteSelected(true)}
            >
              Clear {selected.size} selected
            </Button>
          )}
          {rows.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmClearAll(true)}
              className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
            >
              Clear all memory
            </Button>
          )}
        </div>
      </div>

      {/* Stat strip */}
      <div className="flex flex-wrap gap-3 items-center text-sm text-slate-500">
        <span>
          <span className="font-semibold text-slate-900">{rows.length}</span> total
        </span>
        {filtered.length !== rows.length && (
          <span>
            • <span className="font-semibold text-slate-900">{filtered.length}</span> matching filter
          </span>
        )}
        {selected.size > 0 && (
          <span>
            • <span className="font-semibold text-slate-900">{selected.size}</span> selected
          </span>
        )}
      </div>

      {/* Search */}
      <Input
        placeholder="Search merchant or category…"
        className="h-8 w-72 text-sm"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Table */}
      {loading ? (
        <p className="text-slate-400 text-sm">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="border rounded-lg p-10 text-center bg-slate-50">
          <p className="text-slate-700 font-medium">No memory entries yet</p>
          <p className="text-slate-500 text-sm mt-1">
            When you manually correct a category on the Transactions page, the merchant is remembered here.
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="w-10 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleAllVisible}
                    className="rounded"
                  />
                </th>
                <th className="text-left px-4 py-2 font-medium text-slate-600">Merchant (normalized)</th>
                <th className="text-left px-4 py-2 font-medium text-slate-600">Category</th>
                <th className="text-left px-4 py-2 font-medium text-slate-600">Last updated</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                    No matches for &ldquo;{search}&rdquo;
                  </td>
                </tr>
              )}
              {filtered.map((r, i) => (
                <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="px-3 py-1.5">
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggleOne(r.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-4 py-1.5 text-slate-800 font-mono text-xs">
                    {r.normalizedDesc || <span className="italic text-slate-400">(empty)</span>}
                  </td>
                  <td className="px-4 py-1.5">
                    {r.categoryName ? (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-700">{r.categoryName}</span>
                        {r.categoryKind && (
                          <Badge
                            variant={r.categoryKind === 'income' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {r.categoryKind}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">(deleted category)</span>
                    )}
                  </td>
                  <td className="px-4 py-1.5 text-slate-500">{formatDate(r.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteSelected}
        title={`Clear ${selected.size} memory entr${selected.size === 1 ? 'y' : 'ies'}?`}
        description="Future imports of these merchants will be re-categorized fresh by AI instead of being matched from memory. Existing transactions are not affected. This cannot be undone."
        onConfirm={handleDeleteSelected}
        onCancel={() => setConfirmDeleteSelected(false)}
      />

      <ConfirmDialog
        open={confirmClearAll}
        title="Clear ALL memory entries?"
        description={`This will permanently remove all ${rows.length} learned merchant mappings for this business. The next import will re-categorize every merchant from scratch using AI. Existing transactions are not affected. This cannot be undone.`}
        onConfirm={handleClearAll}
        onCancel={() => setConfirmClearAll(false)}
      />
    </div>
  )
}

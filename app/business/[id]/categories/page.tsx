'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { Category } from '@/lib/types'

export default function CategoriesPage() {
  const { id } = useParams<{ id: string }>()
  const [categories, setCategories] = useState<Category[]>([])
  const [newName, setNewName] = useState('')
  const [newKind, setNewKind] = useState<'income' | 'expense'>('expense')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchCategories() {
    const res = await fetch(`/api/categories?businessId=${id}`)
    const data = await res.json()
    setCategories(data)
    setLoading(false)
  }

  useEffect(() => { fetchCategories() }, [id])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId: id, name: newName.trim(), kind: newKind }),
    })
    if (res.ok) {
      toast.success('Category added')
      setNewName('')
      fetchCategories()
    }
  }

  async function handleRename(catId: string) {
    if (!editName.trim()) return
    const res = await fetch(`/api/categories/${catId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim() }),
    })
    if (res.ok) {
      toast.success('Renamed')
      setEditingId(null)
      fetchCategories()
    }
  }

  async function handleDelete(cat: Category) {
    const res = await fetch(`/api/categories/${cat.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success(`Deleted "${cat.name}"`)
      setDeleteTarget(null)
      fetchCategories()
    }
  }

  const income = categories.filter((c) => c.kind === 'income')
  const expenses = categories.filter((c) => c.kind === 'expense')

  function renderGroup(group: Category[], label: string) {
    return (
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">{label}</h2>
        {group.map((cat) => (
          <div key={cat.id} className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2">
            {editingId === cat.id ? (
              <>
                <Input
                  className="h-7 text-sm flex-1"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRename(cat.id)}
                  autoFocus
                />
                <Button size="sm" onClick={() => handleRename(cat.id)}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-slate-800">{cat.name}</span>
                <Badge variant={cat.kind === 'income' ? 'default' : 'secondary'} className="text-xs">
                  {cat.kind}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setEditingId(cat.id); setEditName(cat.name) }}
                >
                  Rename
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-500 hover:text-red-700"
                  onClick={() => setDeleteTarget(cat)}
                >
                  Delete
                </Button>
              </>
            )}
          </div>
        ))}
        {group.length === 0 && (
          <p className="text-slate-400 text-sm px-1">No {label.toLowerCase()} categories</p>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-xl space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">Categories</h1>

      {loading ? (
        <p className="text-slate-400 text-sm">Loading…</p>
      ) : (
        <>
          {renderGroup(income, 'Income')}
          {renderGroup(expenses, 'Expenses')}
        </>
      )}

      <form onSubmit={handleAdd} className="border rounded-lg bg-white p-5 space-y-3">
        <h2 className="font-semibold text-slate-800">Add category</h2>
        <div className="flex gap-2">
          <Input
            placeholder="Category name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
            className="flex-1"
          />
          <Select value={newKind} onValueChange={(v) => setNewKind(v as 'income' | 'expense')}>
            <SelectTrigger className="w-32">
              <span>{newKind === 'income' ? 'Income' : 'Expense'}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" className="w-full">Add</Button>
      </form>

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete "${deleteTarget?.name}"?`}
        description="Transactions in this category will become Uncategorized. This cannot be undone."
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

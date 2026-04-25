'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { toast } from 'sonner'
import type { Business } from '@/lib/types'

function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function ManageBusinessesPage() {
  const router = useRouter()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)

  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<Business | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/businesses')
    const data = await res.json()
    setBusinesses(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    const res = await fetch('/api/businesses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    })
    const data = await res.json()
    setCreating(false)
    if (res.ok) {
      toast.success(`Created "${data.name}"`)
      setNewName('')
      fetchAll()
    } else {
      toast.error(data.error ?? 'Failed to create')
    }
  }

  async function handleRename(b: Business) {
    if (!editName.trim() || editName === b.name) {
      setEditingId(null)
      return
    }
    const res = await fetch(`/api/businesses/${b.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim() }),
    })
    if (res.ok) {
      toast.success('Renamed')
      setEditingId(null)
      fetchAll()
      router.refresh()
    } else {
      toast.error('Rename failed')
    }
  }

  async function handleDelete(b: Business) {
    const res = await fetch(`/api/businesses/${b.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success(`Deleted "${b.name}"`)
      setDeleteTarget(null)
      fetchAll()
    } else {
      toast.error('Delete failed')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="font-semibold text-slate-800">
            Bookkeeping
          </Link>
          <span className="text-sm text-slate-500">Manage businesses</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Your businesses</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {businesses.length === 0
              ? 'Create your first business to get started.'
              : `${businesses.length} business${businesses.length === 1 ? '' : 'es'}. Click any to switch.`}
          </p>
        </div>

        {/* Create form */}
        <form
          onSubmit={handleCreate}
          className="rounded-xl border bg-white p-5 space-y-3"
        >
          <h2 className="font-semibold text-slate-800">Add a new business</h2>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. Acme LLC"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              className="flex-1"
            />
            <Button type="submit" disabled={creating || !newName.trim()}>
              {creating ? 'Creating…' : 'Create'}
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            A starter set of categories (Income, Software, Meals, Travel, etc.) is created automatically.
          </p>
        </form>

        {/* List */}
        <div className="space-y-2">
          {loading && (
            <p className="text-slate-400 text-sm">Loading…</p>
          )}

          {!loading && businesses.length === 0 && (
            <div className="rounded-xl border bg-white p-8 text-center">
              <p className="text-slate-500 text-sm">No businesses yet.</p>
            </div>
          )}

          {!loading &&
            businesses.map((b) => (
              <div
                key={b.id}
                className="rounded-xl border bg-white p-4 flex items-center gap-3"
              >
                {editingId === b.id ? (
                  <>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(b)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      autoFocus
                      className="flex-1"
                    />
                    <Button size="sm" onClick={() => handleRename(b)}>
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Link
                      href={`/business/${b.id}`}
                      className="flex-1 min-w-0 group"
                    >
                      <p className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                        {b.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        Created {formatDate(b.createdAt)}
                      </p>
                    </Link>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(b.id)
                        setEditName(b.name)
                      }}
                    >
                      Rename
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => setDeleteTarget(b)}
                    >
                      Delete
                    </Button>
                  </>
                )}
              </div>
            ))}
        </div>

        <ConfirmDialog
          open={!!deleteTarget}
          title={`Delete "${deleteTarget?.name}"?`}
          description="This permanently removes the business and ALL its transactions, categories, and merchant memory. This cannot be undone."
          onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      </main>
    </div>
  )
}

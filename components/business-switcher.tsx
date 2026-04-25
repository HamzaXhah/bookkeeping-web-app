'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import type { Business } from '@/lib/types'

const NEW_SENTINEL = '__new_business__'
const MANAGE_SENTINEL = '__manage_businesses__'

type Props = {
  businesses: Business[]
  currentId: string
}

export function BusinessSwitcher({ businesses, currentId }: Props) {
  const router = useRouter()
  const current = businesses.find((b) => b.id === currentId)

  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)

  function handleSelect(v: string | null) {
    if (!v) return
    if (v === NEW_SENTINEL) {
      setCreateOpen(true)
      return
    }
    if (v === MANAGE_SENTINEL) {
      router.push('/businesses')
      return
    }
    if (v !== currentId) router.push(`/business/${v}`)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    const res = await fetch('/api/businesses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const data = await res.json()
    setCreating(false)
    if (res.ok) {
      toast.success(`Created "${data.name}"`)
      setCreateOpen(false)
      setName('')
      router.push(`/business/${data.id}`)
      router.refresh()
    } else {
      toast.error(data.error ?? 'Failed to create business')
    }
  }

  return (
    <>
      <Select value={currentId} onValueChange={handleSelect}>
        <SelectTrigger className="w-48 h-8 text-sm font-medium">
          <span className="truncate">{current?.name ?? 'Select business'}</span>
        </SelectTrigger>
        <SelectContent>
          {businesses.map((b) => (
            <SelectItem key={b.id} value={b.id}>
              {b.name}
            </SelectItem>
          ))}
          <div className="my-1 -mx-1 h-px bg-border" />
          <SelectItem value={NEW_SENTINEL}>
            <span className="text-blue-600 font-medium">+ Add new business</span>
          </SelectItem>
          <SelectItem value={MANAGE_SENTINEL}>
            <span className="text-slate-600">Manage businesses…</span>
          </SelectItem>
        </SelectContent>
      </Select>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add a new business</DialogTitle>
            <DialogDescription>
              Each business has its own transactions, categories, and merchant memory.
              Default categories will be created for you.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="new-biz-name">Business name</Label>
              <Input
                id="new-biz-name"
                placeholder="Acme LLC"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                required
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating || !name.trim()}>
                {creating ? 'Creating…' : 'Create business'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

export function CreateBusinessForm() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    const res = await fetch('/api/businesses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const data = await res.json()
    if (res.ok) {
      router.push(`/business/${data.id}`)
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border rounded-lg bg-white p-5">
      <h2 className="font-semibold text-slate-800">Create a business</h2>
      <div className="space-y-1">
        <Label htmlFor="biz-name">Business name</Label>
        <Input
          id="biz-name"
          placeholder="Acme LLC"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Creating…' : 'Create business'}
      </Button>
    </form>
  )
}

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export type DateRange = { from: string; to: string }

function today() {
  return new Date().toISOString().slice(0, 10)
}

function startOf(unit: 'month' | 'quarter' | 'year'): string {
  const d = new Date()
  if (unit === 'month') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  if (unit === 'quarter') {
    const q = Math.floor(d.getMonth() / 3)
    return `${d.getFullYear()}-${String(q * 3 + 1).padStart(2, '0')}-01`
  }
  return `${d.getFullYear()}-01-01`
}

function lastMonthRange(): DateRange {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - 1)
  const from = d.toISOString().slice(0, 10)
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return { from, to: last.toISOString().slice(0, 10) }
}

type Props = {
  value: DateRange
  onChange: (r: DateRange) => void
}

export function DateRangePicker({ value, onChange }: Props) {
  const presets = [
    { label: 'This Month', range: () => ({ from: startOf('month'), to: today() }) },
    { label: 'Last Month', range: lastMonthRange },
    { label: 'This Quarter', range: () => ({ from: startOf('quarter'), to: today() }) },
    { label: 'YTD', range: () => ({ from: startOf('year'), to: today() }) },
  ]

  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map((p) => (
        <Button
          key={p.label}
          variant="outline"
          size="sm"
          onClick={() => onChange(p.range())}
        >
          {p.label}
        </Button>
      ))}
      <div className="flex items-center gap-1">
        <Input
          type="date"
          className="h-8 w-36 text-sm"
          value={value.from}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
        />
        <span className="text-muted-foreground text-sm">to</span>
        <Input
          type="date"
          className="h-8 w-36 text-sm"
          value={value.to}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
        />
      </div>
    </div>
  )
}

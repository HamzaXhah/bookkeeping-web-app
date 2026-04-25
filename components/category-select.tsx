'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import type { Category } from '@/lib/types'

type Props = {
  categories: Category[]
  value: string | null
  onChange: (categoryId: string | null) => void
  placeholder?: string
}

export function CategorySelect({ categories, value, onChange, placeholder = 'Uncategorized' }: Props) {
  const income = categories.filter((c) => c.kind === 'income')
  const expenses = categories.filter((c) => c.kind === 'expense')

  const selected = value ? categories.find((c) => c.id === value) : null
  const displayLabel = selected ? selected.name : placeholder

  return (
    <Select value={value ?? ''} onValueChange={(v) => onChange(v)}>
      <SelectTrigger className="w-48 h-8 text-sm">
        <span className="truncate">{displayLabel}</span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">Uncategorized</SelectItem>
        {income.length > 0 && (
          <>
            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Income
            </div>
            {income.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </>
        )}
        {expenses.length > 0 && (
          <>
            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Expenses
            </div>
            {expenses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </>
        )}
      </SelectContent>
    </Select>
  )
}

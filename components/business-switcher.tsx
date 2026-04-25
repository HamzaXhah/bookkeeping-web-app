'use client'

import { useRouter } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import type { Business } from '@/lib/types'

type Props = {
  businesses: Business[]
  currentId: string
}

export function BusinessSwitcher({ businesses, currentId }: Props) {
  const router = useRouter()
  const current = businesses.find((b) => b.id === currentId)

  return (
    <Select value={currentId} onValueChange={(id) => id && router.push(`/business/${id}`)}>
      <SelectTrigger className="w-48 h-8 text-sm font-medium">
        <span className="truncate">{current?.name ?? 'Select business'}</span>
      </SelectTrigger>
      <SelectContent>
        {businesses.map((b) => (
          <SelectItem key={b.id} value={b.id}>
            {b.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

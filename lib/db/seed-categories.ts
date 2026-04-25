import { db } from './client'
import { categories } from './schema'
import { createId } from '@paralleldrive/cuid2'

const DEFAULT_CATEGORIES: { name: string; kind: 'income' | 'expense' }[] = [
  { name: 'Income', kind: 'income' },
  { name: 'Software', kind: 'expense' },
  { name: 'Meals', kind: 'expense' },
  { name: 'Travel', kind: 'expense' },
  { name: 'Office Supplies', kind: 'expense' },
  { name: 'Contractor Payments', kind: 'expense' },
  { name: 'Professional Services', kind: 'expense' },
  { name: 'Marketing', kind: 'expense' },
  { name: 'Equipment', kind: 'expense' },
  { name: 'Bank Fees', kind: 'expense' },
]

export async function seedCategories(businessId: string) {
  await db.insert(categories).values(
    DEFAULT_CATEGORIES.map((c) => ({
      id: createId(),
      businessId,
      name: c.name,
      kind: c.kind,
    }))
  )
}

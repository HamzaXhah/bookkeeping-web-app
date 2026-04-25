import { sqliteTable, text, integer, real, uniqueIndex, index } from 'drizzle-orm/sqlite-core'

export const businesses = sqliteTable('businesses', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: integer('created_at').notNull(),
})

export const categories = sqliteTable(
  'categories',
  {
    id: text('id').primaryKey(),
    businessId: text('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    kind: text('kind', { enum: ['income', 'expense'] }).notNull(),
  },
  (t) => [uniqueIndex('categories_business_name_idx').on(t.businessId, t.name)]
)

export const transactions = sqliteTable(
  'transactions',
  {
    id: text('id').primaryKey(),
    businessId: text('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    date: text('date').notNull(),
    description: text('description').notNull(),
    amount: real('amount').notNull(),
    categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
    dedupHash: text('dedup_hash').notNull(),
    sourceFile: text('source_file'),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [
    uniqueIndex('transactions_business_hash_idx').on(t.businessId, t.dedupHash),
    index('transactions_business_date_idx').on(t.businessId, t.date),
  ]
)

export const merchantMemory = sqliteTable(
  'merchant_memory',
  {
    id: text('id').primaryKey(),
    businessId: text('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    normalizedDesc: text('normalized_desc').notNull(),
    categoryId: text('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [uniqueIndex('merchant_memory_business_desc_idx').on(t.businessId, t.normalizedDesc)]
)

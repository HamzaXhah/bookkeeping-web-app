import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { db } from './client'
import path from 'path'

let migrated = false

export function runMigrations() {
  if (migrated) return
  migrate(db, { migrationsFolder: path.join(process.cwd(), 'lib/db/migrations') })
  migrated = true
}

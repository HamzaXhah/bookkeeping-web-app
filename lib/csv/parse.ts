import Papa from 'papaparse'

export type ParsedRow = {
  date: string
  description: string
  amount: number
}

function findHeader(headers: string[], candidates: string[]): string | null {
  const lower = headers.map((h) => h.toLowerCase().trim())
  for (const c of candidates) {
    const idx = lower.findIndex((h) => h.includes(c))
    if (idx !== -1) return headers[idx]
  }
  return null
}

function parseAmount(val: string): number {
  if (!val) return 0
  const cleaned = val.replace(/[$,\s]/g, '').replace(/\((.+)\)/, '-$1')
  return parseFloat(cleaned) || 0
}

function parseDate(val: string): string {
  if (!val) return ''
  const trimmed = val.trim()
  // Try to normalise to ISO yyyy-mm-dd
  const d = new Date(trimmed)
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10)
  }
  return trimmed
}

export function parseCSV(csvText: string): ParsedRow[] {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  })

  const headers = result.meta.fields ?? []

  const dateCol = findHeader(headers, ['date', 'posted', 'transaction date', 'trans date'])
  const descCol = findHeader(headers, ['description', 'memo', 'narrative', 'details', 'payee', 'name'])
  const amountCol = findHeader(headers, ['amount'])
  const creditCol = findHeader(headers, ['credit', 'credits', 'deposit', 'deposits'])
  const debitCol = findHeader(headers, ['debit', 'debits', 'withdrawal', 'withdrawals', 'charge'])

  if (!dateCol || !descCol) {
    throw new Error(`Could not detect required columns. Headers found: ${headers.join(', ')}`)
  }

  return result.data
    .map((row) => {
      const date = parseDate(row[dateCol] ?? '')
      const description = (row[descCol] ?? '').trim()

      let amount: number
      if (amountCol) {
        amount = parseAmount(row[amountCol] ?? '0')
      } else if (creditCol && debitCol) {
        const credit = parseAmount(row[creditCol] ?? '0')
        const debit = parseAmount(row[debitCol] ?? '0')
        // credits positive, debits negative
        amount = credit > 0 ? credit : -Math.abs(debit)
      } else {
        amount = 0
      }

      return { date, description, amount }
    })
    .filter((r) => r.date && r.description)
}

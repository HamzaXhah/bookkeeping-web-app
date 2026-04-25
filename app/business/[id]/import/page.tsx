'use client'

import { useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { ImportResult } from '@/lib/types'

function ResultModal({
  open,
  result,
  businessId,
  onClose,
}: {
  open: boolean
  result: ImportResult | null
  businessId: string
  onClose: () => void
}) {
  if (!result) return null
  const total = result.imported
  const autoCategorized = result.aiCategorized + result.memoryCategorized
  const reviewPct = total > 0 ? Math.round((result.needsReview / total) * 100) : 0
  const autoPct = total > 0 ? Math.round((autoCategorized / total) * 100) : 0

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import complete</DialogTitle>
          <DialogDescription>
            {total > 0
              ? `${total} new transaction${total > 1 ? 's' : ''} added.`
              : 'No new transactions — every row was a duplicate.'}
            {result.skippedDuplicates > 0 && (
              <> {result.skippedDuplicates} duplicate{result.skippedDuplicates > 1 ? 's were' : ' was'} skipped.</>
            )}
          </DialogDescription>
        </DialogHeader>

        {total > 0 && (
          <div className="space-y-3 pt-2">
            {/* Visual bar */}
            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden flex">
              {result.aiCategorized > 0 && (
                <div
                  className="bg-blue-500 h-full"
                  style={{ width: `${(result.aiCategorized / total) * 100}%` }}
                  title="AI categorized"
                />
              )}
              {result.memoryCategorized > 0 && (
                <div
                  className="bg-green-500 h-full"
                  style={{ width: `${(result.memoryCategorized / total) * 100}%` }}
                  title="Matched from memory"
                />
              )}
              {result.needsReview > 0 && (
                <div
                  className="bg-amber-400 h-full"
                  style={{ width: `${(result.needsReview / total) * 100}%` }}
                  title="Needs review"
                />
              )}
            </div>

            {/* Breakdown rows */}
            <div className="space-y-2 text-sm">
              {result.aiCategorized > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span className="text-slate-700">Categorized by AI</span>
                  </div>
                  <span className="font-semibold text-slate-900">{result.aiCategorized}</span>
                </div>
              )}
              {result.memoryCategorized > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                    <span className="text-slate-700">Matched from memory</span>
                  </div>
                  <span className="font-semibold text-slate-900">{result.memoryCategorized}</span>
                </div>
              )}
              {result.needsReview > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span className="text-slate-700 font-medium">Needs human review</span>
                  </div>
                  <span className="font-semibold text-amber-700">{result.needsReview}</span>
                </div>
              )}
            </div>

            {/* Review callout */}
            {result.needsReview > 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
                <p className="font-semibold text-amber-900">
                  ⚠ {result.needsReview} transaction{result.needsReview > 1 ? 's' : ''} ({reviewPct}%) need manual review
                </p>
                <p className="text-amber-800 mt-1">
                  The AI was unable to confidently categorize these. Open the Transactions page to assign categories — the system will remember your choices for future imports.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm">
                <p className="font-semibold text-green-900">
                  ✓ All {total} transactions categorized automatically ({autoPct}%)
                </p>
                <p className="text-green-800 mt-1">
                  Every row was matched either from merchant memory or by AI. You can still review and correct categories on the Transactions page.
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose}>
            Import another
          </Button>
          <Link href={`/business/${businessId}/transactions`}>
            <Button>
              {result.needsReview > 0 ? 'Review transactions' : 'View transactions'}
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function ImportPage() {
  const { id } = useParams<{ id: string }>()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleUpload() {
    if (!file) return
    setLoading(true)
    setResult(null)
    setError(null)
    const form = new FormData()
    form.append('file', file)
    form.append('businessId', id)

    const res = await fetch('/api/import', { method: 'POST', body: form })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Import failed')
      toast.error(data.error ?? 'Import failed')
    } else {
      setResult(data)
      setShowModal(true)
      if (data.needsReview > 0) {
        toast.warning(`${data.needsReview} transactions need review`)
      } else if (data.imported > 0) {
        toast.success(`Imported ${data.imported} transactions`)
      }
    }
  }

  function handleReset() {
    setShowModal(false)
    setFile(null)
    setResult(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Import CSV</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Upload a bank or credit card CSV to import transactions.
        </p>
      </div>

      <div
        className="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-colors"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const f = e.dataTransfer.files[0]
          if (f) setFile(f)
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        {file ? (
          <p className="text-slate-700 font-medium">{file.name}</p>
        ) : (
          <p className="text-slate-400 text-sm">Drag &amp; drop a CSV here, or click to select</p>
        )}
      </div>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 rounded-lg px-4 py-3">{error}</p>
      )}

      <Button onClick={handleUpload} disabled={!file || loading} className="w-full">
        {loading ? 'Importing & categorizing…' : 'Import'}
      </Button>

      <ResultModal
        open={showModal}
        result={result}
        businessId={id}
        onClose={handleReset}
      />
    </div>
  )
}

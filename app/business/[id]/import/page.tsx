'use client'

import { useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

type Result = {
  imported: number
  skippedDuplicates: number
  aiCategorized: number
  memoryCategorized: number
}

export default function ImportPage() {
  const { id } = useParams<{ id: string }>()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
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
      toast.success(`Imported ${data.imported} transactions`)
    }
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

      {result && (
        <div className="rounded-lg border bg-white p-5 space-y-3">
          <p className="font-semibold text-slate-800">Import complete</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="default">{result.imported} imported</Badge>
            <Badge variant="secondary">{result.skippedDuplicates} duplicates skipped</Badge>
            <Badge variant="outline">{result.aiCategorized} AI categorized</Badge>
            <Badge variant="outline">{result.memoryCategorized} from memory</Badge>
          </div>
          <Link
            href={`/business/${id}/transactions`}
            className="inline-block text-sm text-slate-600 underline hover:text-slate-900"
          >
            View transactions →
          </Link>
        </div>
      )}

      <Button onClick={handleUpload} disabled={!file || loading} className="w-full">
        {loading ? 'Importing…' : 'Import'}
      </Button>
    </div>
  )
}

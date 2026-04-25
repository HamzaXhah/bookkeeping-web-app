'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { DateRangePicker, type DateRange } from '@/components/date-range-picker'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PnLReport } from '@/lib/types'

function startOfMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

export default function PnLPage() {
  const { id } = useParams<{ id: string }>()
  const [dateRange, setDateRange] = useState<DateRange>({ from: startOfMonth(), to: today() })
  const [report, setReport] = useState<PnLReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [bizName, setBizName] = useState('')

  const fetchReport = useCallback(async () => {
    setLoading(true)
    const [rRes, bRes] = await Promise.all([
      fetch(`/api/pnl?businessId=${id}&from=${dateRange.from}&to=${dateRange.to}`),
      fetch(`/api/businesses/${id}`),
    ])
    const [rData, bData] = await Promise.all([rRes.json(), bRes.json()])
    setReport(rData)
    setBizName(bData.name ?? '')
    setLoading(false)
  }, [id, dateRange])

  useEffect(() => { fetchReport() }, [fetchReport])

  async function exportPDF() {
    if (!report) return
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    let y = 20
    doc.setFontSize(16)
    doc.text(`${bizName} — P&L Report`, 14, y); y += 8
    doc.setFontSize(10)
    doc.text(`Period: ${report.range.from} to ${report.range.to}`, 14, y); y += 10

    doc.setFontSize(12)
    doc.text('Income', 14, y); y += 6
    doc.setFontSize(10)
    for (const row of report.income) {
      doc.text(`  ${row.category}`, 14, y)
      doc.text(fmt(row.total), 160, y, { align: 'right' }); y += 6
    }
    doc.setFontSize(11)
    doc.text('Total Income', 14, y)
    doc.text(fmt(report.totals.income), 160, y, { align: 'right' }); y += 10

    doc.setFontSize(12)
    doc.text('Expenses', 14, y); y += 6
    doc.setFontSize(10)
    for (const row of report.expenses) {
      doc.text(`  ${row.category}`, 14, y)
      doc.text(fmt(row.total), 160, y, { align: 'right' }); y += 6
    }
    doc.setFontSize(11)
    doc.text('Total Expenses', 14, y)
    doc.text(fmt(report.totals.expenses), 160, y, { align: 'right' }); y += 10

    doc.setFontSize(13)
    doc.text('Net Profit', 14, y)
    doc.text(fmt(report.totals.net), 160, y, { align: 'right' })

    doc.save(`pnl-${report.range.from}-${report.range.to}.pdf`)
  }

  async function exportExcel() {
    if (!report) return
    const XLSX = await import('xlsx')
    const rows: (string | number)[][] = [
      [`${bizName} — P&L Report`],
      [`Period: ${report.range.from} to ${report.range.to}`],
      [],
      ['Income'],
      ['Category', 'Amount'],
      ...report.income.map((r) => [r.category, r.total]),
      ['Total Income', report.totals.income],
      [],
      ['Expenses'],
      ['Category', 'Amount'],
      ...report.expenses.map((r) => [r.category, r.total]),
      ['Total Expenses', report.totals.expenses],
      [],
      ['Net Profit', report.totals.net],
    ]
    const ws = XLSX.utils.aoa_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'P&L')
    XLSX.writeFile(wb, `pnl-${report.range.from}-${report.range.to}.xlsx`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-900">P&amp;L Report</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportPDF} disabled={!report}>
            Export PDF
          </Button>
          <Button variant="outline" size="sm" onClick={exportExcel} disabled={!report}>
            Export Excel
          </Button>
        </div>
      </div>

      <DateRangePicker value={dateRange} onChange={setDateRange} />

      {loading && <p className="text-slate-400 text-sm">Loading…</p>}

      {report && !loading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Income</CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <tbody>
                    {report.income.length === 0 && (
                      <tr><td className="py-2 text-slate-400">No income entries</td></tr>
                    )}
                    {report.income.map((r) => (
                      <tr key={r.category} className="border-b last:border-0">
                        <td className="py-1.5 text-slate-700">{r.category}</td>
                        <td className="py-1.5 text-right font-medium text-green-600">{fmt(r.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-semibold">
                      <td className="pt-2">Total</td>
                      <td className="pt-2 text-right text-green-700">{fmt(report.totals.income)}</td>
                    </tr>
                  </tfoot>
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <tbody>
                    {report.expenses.length === 0 && (
                      <tr><td className="py-2 text-slate-400">No expense entries</td></tr>
                    )}
                    {report.expenses.map((r) => (
                      <tr key={r.category} className="border-b last:border-0">
                        <td className="py-1.5 text-slate-700">{r.category}</td>
                        <td className="py-1.5 text-right font-medium text-red-600">{fmt(r.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-semibold">
                      <td className="pt-2">Total</td>
                      <td className="pt-2 text-right text-red-700">{fmt(report.totals.expenses)}</td>
                    </tr>
                  </tfoot>
                </table>
              </CardContent>
            </Card>
          </div>

          <Card className={`border-2 ${report.totals.net >= 0 ? 'border-green-200' : 'border-red-200'}`}>
            <CardContent className="flex items-center justify-between py-4">
              <span className="font-semibold text-slate-800">Net Profit</span>
              <span className={`text-2xl font-bold ${report.totals.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {fmt(report.totals.net)}
              </span>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
